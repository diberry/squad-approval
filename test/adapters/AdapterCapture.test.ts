import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubApprovalCapture } from '../../src/adapters/GitHubApprovalCapture.js';
import { DecisionApprovalCapture } from '../../src/adapters/DecisionApprovalCapture.js';
import { ADOApprovalCapture } from '../../src/adapters/ADOApprovalCapture.js';
import { ApprovalQueue } from '../../src/queue/ApprovalQueue.js';

describe('GitHubApprovalCapture', () => {
  let queue: ApprovalQueue;
  let capture: GitHubApprovalCapture;

  beforeEach(() => {
    queue = new ApprovalQueue();
    capture = new GitHubApprovalCapture(queue);
  });

  it('onPROpened() creates ApprovalItem with PR context', async () => {
    const item = await capture.onPROpened(42, 'https://github.com/test/repo/pull/42', 'Fix auth', 'Auth fix body');
    expect(item.id).toBe('github-pr-42');
    expect(item.type).toBe('github-pr');
    expect(item.title).toBe('Fix auth');
    expect(item.metadata.githubPRNumber).toBe(42);
    expect(item.metadata.githubPRUrl).toBe('https://github.com/test/repo/pull/42');
    expect(queue.size()).toBe(1);
  });

  it('onPRLabeled() with needs-approval flag creates/updates item', async () => {
    const item = await capture.onPRLabeled(99, 'https://github.com/test/repo/pull/99', 'New feature', 'Body', 'needs-approval');
    expect(item).not.toBeNull();
    expect(item!.id).toBe('github-pr-99');
    expect(queue.size()).toBe(1);

    // Non-approval label returns null
    const queue2 = new ApprovalQueue();
    const capture2 = new GitHubApprovalCapture(queue2);
    const result = await capture2.onPRLabeled(100, 'url', 'PR', 'body', 'enhancement');
    expect(result).toBeNull();
    expect(queue2.size()).toBe(0);
  });

  it('captures PR diff summary in context', async () => {
    const item = await capture.onPROpened(50, 'url', 'PR', 'body', '+10 files changed');
    expect(item.context.affectedFiles).toContain('+10 files changed');
  });

  it('onPRCommented() updates item on approval/rejection comment', async () => {
    await capture.onPROpened(10, 'url', 'PR', 'body');
    await capture.onPRCommented(10, '/approve', 'alice');
    expect(queue.get('github-pr-10')!.status).toBe('approved');
    expect(queue.get('github-pr-10')!.metadata.approvedBy).toBe('alice');
  });
});

describe('DecisionApprovalCapture', () => {
  let queue: ApprovalQueue;
  let capture: DecisionApprovalCapture;

  beforeEach(() => {
    queue = new ApprovalQueue();
    capture = new DecisionApprovalCapture(queue);
  });

  it('onDecisionInbox() creates item from .squad/decisions/inbox/', async () => {
    const item = await capture.onDecisionInbox('.squad/decisions/inbox/use-redis.md', 'Use Redis', 'Better perf');
    expect(item.type).toBe('decision');
    expect(item.title).toBe('Use Redis');
    expect(queue.size()).toBe(1);
  });

  it('extracts agent reasoning and decision context', async () => {
    const item = await capture.onDecisionInbox('.squad/decisions/inbox/test.md', 'Test', 'Agent reasoning here');
    expect(item.context.agentReasoning).toBe('Agent reasoning here');
    expect(item.metadata.decisionPath).toBe('.squad/decisions/inbox/test.md');
  });

  it('onDecisionMoved() updates item status when approved', async () => {
    const item = await capture.onDecisionInbox('.squad/decisions/inbox/test.md', 'Test', 'Reasoning');
    await capture.onDecisionMoved(item.id, '.squad/decisions/approved/test.md');
    expect(queue.get(item.id)!.status).toBe('approved');
  });
});

describe('ADOApprovalCapture', () => {
  let queue: ApprovalQueue;
  let capture: ADOApprovalCapture;

  beforeEach(() => {
    queue = new ApprovalQueue();
    capture = new ADOApprovalCapture(queue);
  });

  it('onWorkItemEscalated() creates escalation item', async () => {
    const item = await capture.onWorkItemEscalated('12345', 'https://dev.azure.com/item/12345', 'Budget overrun', 'P1');
    expect(item.id).toBe('ado-escalation-12345');
    expect(item.type).toBe('ado-escalation');
    expect(item.title).toBe('Budget overrun');
    expect(queue.size()).toBe(1);
  });

  it('captures work item priority and assignment', async () => {
    const item = await capture.onWorkItemEscalated('555', 'url', 'Critical bug', 'P0');
    expect(item.description).toBe('Priority: P0');
    expect(item.metadata.adoWorkItemId).toBe('555');
    expect(item.metadata.adoWorkItemUrl).toBe('url');
  });

  it('onApprovalGateTriggered() integrates with HookPipeline', async () => {
    const item = await capture.onApprovalGateTriggered('777', 'https://ado/777', 'deploy-gate', 'Deploy approval');
    expect(item.type).toBe('ado-escalation');
    expect(item.context.agentReasoning).toContain('deploy-gate');
    expect(queue.size()).toBe(1);
  });
});
