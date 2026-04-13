import { describe, it, expect } from 'vitest';
import { GitHubApprovalCapture } from '../../src/adapters/GitHubApprovalCapture.js';
import { ApprovalQueue } from '../../src/queue/ApprovalQueue.js';

describe('GitHubApprovalCapture', () => {
  it('onPROpened() creates ApprovalItem with PR context', async () => {
    // TODO: Test PR event capture and item creation
  });

  it('onPRLabeled() with needs-approval flag creates/updates item', async () => {
    // TODO: Test label-based triggering
  });

  it('captures PR diff summary in context', async () => {
    // TODO: Test context population with diff data
  });

  it('onPRCommented() updates item on approval/rejection comment', async () => {
    // TODO: Test comment-based state transitions
  });
});

describe('DecisionApprovalCapture', () => {
  it('onDecisionInbox() creates item from .squad/decisions/inbox/', async () => {
    // TODO: Test decision file monitoring
  });

  it('extracts agent reasoning and decision context', async () => {
    // TODO: Test decision parsing
  });

  it('onDecisionMoved() updates item status when approved', async () => {
    // TODO: Test file movement workflow
  });
});

describe('ADOApprovalCapture', () => {
  it('onWorkItemEscalated() creates escalation item', async () => {
    // TODO: Test ADO work item escalation capture
  });

  it('captures work item priority and assignment', async () => {
    // TODO: Test ADO metadata extraction
  });

  it('onApprovalGateTriggered() integrates with HookPipeline', async () => {
    // TODO: Test hook integration
  });
});
