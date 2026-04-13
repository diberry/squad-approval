import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ApprovalItem } from '../../src/models/ApprovalItem.js';
import { ApprovalQueue } from '../../src/queue/ApprovalQueue.js';
import { ApprovalStore } from '../../src/storage/ApprovalStore.js';
import { GitHubApprovalCapture } from '../../src/adapters/GitHubApprovalCapture.js';
import { InboxCommand } from '../../src/cli/commands/inbox.js';
import { ApproveCommand } from '../../src/cli/commands/approve.js';
import { RejectCommand } from '../../src/cli/commands/reject.js';
import { ApprovalMonitor } from '../../src/monitoring/ApprovalMonitor.js';

const E2E_DIR = path.join(process.cwd(), '.test-e2e-approvals');
const PENDING_PATH = path.join(E2E_DIR, 'pending.json');
const HISTORY_PATH = path.join(E2E_DIR, 'history');

function cleanup() {
  if (fs.existsSync(E2E_DIR)) {
    fs.rmSync(E2E_DIR, { recursive: true, force: true });
  }
}

describe('End-to-End Workflow', () => {
  let queue: ApprovalQueue;
  let store: ApprovalStore;

  beforeEach(() => {
    cleanup();
    queue = new ApprovalQueue();
    store = new ApprovalStore({ pendingPath: PENDING_PATH, historyPath: HISTORY_PATH });
  });

  afterEach(() => {
    cleanup();
  });

  it('completes full cycle: propose → queue → approve → archive', async () => {
    // 1. Agent proposes a PR
    const capture = new GitHubApprovalCapture(queue);
    const item = await capture.onPROpened(42, 'https://github.com/test/repo/pull/42', 'Add feature X', 'New feature');

    // 2. Item is queued
    expect(queue.pending()).toHaveLength(1);
    expect(item.status).toBe('pending');

    // 3. Human reviews via inbox
    const inbox = new InboxCommand(queue);
    const output = await inbox.list();
    expect(output).toContain('github-pr-42');

    // 4. Human approves
    const approveCmd = new ApproveCommand(queue);
    await approveCmd.execute('github-pr-42', 'alice', 'LGTM');
    expect(queue.get('github-pr-42')!.status).toBe('approved');

    // 5. Archive approved item
    await store.archive(queue.get('github-pr-42')!);
    const history = await store.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('approved');
  });

  it('handles rejection workflow with retry', async () => {
    const capture = new GitHubApprovalCapture(queue);
    await capture.onPROpened(55, 'url', 'Risky change', 'Big refactor');

    // Reject
    const rejectCmd = new RejectCommand(queue);
    await rejectCmd.execute('github-pr-55', 'bob', 'Needs more tests');
    expect(queue.get('github-pr-55')!.status).toBe('rejected');

    // Agent resubmits (new PR or updated)
    const queue2 = new ApprovalQueue();
    const capture2 = new GitHubApprovalCapture(queue2);
    const resubmitted = await capture2.onPROpened(56, 'url2', 'Risky change v2', 'Added tests');
    expect(resubmitted.status).toBe('pending');
    expect(queue2.pending()).toHaveLength(1);
  });

  it('expiry workflow: timeout → escalation → auto-reject', async () => {
    // Old item that should be expired
    const oldItem = new ApprovalItem('exp-1', 'github-pr', 'Forgotten PR', 'Desc', new Date(Date.now() - 90000000)); // 25 hours ago
    queue.add(oldItem);

    // Monitor detects stale items
    const monitor = new ApprovalMonitor(queue, 3600000);
    const stale = monitor.checkStale();
    expect(stale).toHaveLength(1);

    // Auto-expire
    const expired = queue.expireStale(86400000); // 24h threshold
    expect(expired).toHaveLength(1);
    expect(expired[0].status).toBe('expired');
  });

  it('persistence round-trip: save → load → verify', async () => {
    queue.add(new ApprovalItem('rt-1', 'github-pr', 'PR', 'Desc'));
    queue.add(new ApprovalItem('rt-2', 'decision', 'Decision', 'Desc'));

    await store.save(queue);
    const loaded = await store.load();

    expect(loaded.pending()).toHaveLength(2);
    expect(loaded.get('rt-1')!.type).toBe('github-pr');
    expect(loaded.get('rt-2')!.type).toBe('decision');
  });
});
