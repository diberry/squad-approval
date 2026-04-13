import { describe, it, expect, beforeEach } from 'vitest';
import { InboxCommand } from '../../src/cli/commands/inbox.js';
import { ApproveCommand } from '../../src/cli/commands/approve.js';
import { RejectCommand } from '../../src/cli/commands/reject.js';
import { ApprovalQueue } from '../../src/queue/ApprovalQueue.js';
import { ApprovalItem } from '../../src/models/ApprovalItem.js';

describe('CLI Commands', () => {
  describe('inbox', () => {
    let queue: ApprovalQueue;
    let inbox: InboxCommand;

    beforeEach(() => {
      queue = new ApprovalQueue();
      inbox = new InboxCommand(queue);
    });

    it('list() displays pending approvals in table format', async () => {
      queue.add(new ApprovalItem('cli-1', 'github-pr', 'Fix auth bug', 'Desc'));
      queue.add(new ApprovalItem('cli-2', 'decision', 'Use Redis', 'Desc'));

      const output = await inbox.list();
      expect(output).toContain('cli-1');
      expect(output).toContain('cli-2');
      expect(output).toContain('Fix auth bug');
      expect(output).toContain('Use Redis');
    });

    it('formats output readable with truncated titles', async () => {
      const longTitle = 'A'.repeat(60);
      queue.add(new ApprovalItem('trunc-1', 'github-pr', longTitle, 'Desc'));

      const output = await inbox.list();
      expect(output).toContain('...');
      expect(output).not.toContain(longTitle); // full title should be truncated
    });

    it('shows age in human format (2h 15m)', () => {
      const twoHours15Min = 2 * 3600000 + 15 * 60000;
      expect(inbox.formatAge(twoHours15Min)).toBe('2h 15m');
      expect(inbox.formatAge(90000)).toBe('1m');
      expect(inbox.formatAge(5000)).toBe('5s');
      expect(inbox.formatAge(86400000 + 3600000)).toBe('1d 1h');
    });

    it('color-codes by type (PR=blue, decision=yellow, escalation=red)', async () => {
      expect(inbox.colorForType('github-pr')).toBe('\x1b[34m');
      expect(inbox.colorForType('decision')).toBe('\x1b[33m');
      expect(inbox.colorForType('ado-escalation')).toBe('\x1b[31m');
    });

    it('listJSON() returns pending items as JSON', async () => {
      queue.add(new ApprovalItem('json-1', 'github-pr', 'PR', 'Desc'));
      const json = await inbox.listJSON();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('json-1');
      expect(parsed[0].type).toBe('github-pr');
      expect(parsed[0].status).toBe('pending');
    });

    it('list() shows no pending message when empty', async () => {
      const output = await inbox.list();
      expect(output).toContain('No pending approvals');
    });
  });

  describe('approve', () => {
    let queue: ApprovalQueue;
    let approveCmd: ApproveCommand;

    beforeEach(() => {
      queue = new ApprovalQueue();
      approveCmd = new ApproveCommand(queue);
    });

    it('updates item status to approved', async () => {
      queue.add(new ApprovalItem('app-1', 'github-pr', 'PR', 'Desc'));
      await approveCmd.execute('app-1', 'alice');
      expect(queue.get('app-1')!.status).toBe('approved');
      expect(queue.get('app-1')!.metadata.approvedBy).toBe('alice');
    });

    it('persists change to storage', async () => {
      queue.add(new ApprovalItem('app-2', 'github-pr', 'PR', 'Desc'));
      await approveCmd.execute('app-2', 'bob');
      // After approval, the item is approved in the queue
      expect(queue.get('app-2')!.status).toBe('approved');
      expect(queue.pending()).toHaveLength(0);
    });

    it('stores optional reason metadata', async () => {
      queue.add(new ApprovalItem('app-3', 'github-pr', 'PR', 'Desc'));
      await approveCmd.execute('app-3', 'carol', 'Looks good to me');
      // Reason stored in rejectionReason field (reused for approval reason)
      expect(queue.get('app-3')!.metadata.rejectionReason).toBe('Looks good to me');
    });

    it('emits approval event on SDK EventBus', async () => {
      queue.add(new ApprovalItem('app-4', 'github-pr', 'PR', 'Desc'));
      const events: any[] = [];
      approveCmd.onEvent(e => events.push(e));
      await approveCmd.execute('app-4', 'dan');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('approval.approved');
      expect(events[0].itemId).toBe('app-4');
      expect(events[0].approver).toBe('dan');
    });
  });

  describe('reject', () => {
    let queue: ApprovalQueue;
    let rejectCmd: RejectCommand;

    beforeEach(() => {
      queue = new ApprovalQueue();
      rejectCmd = new RejectCommand(queue);
    });

    it('requires --reason flag', async () => {
      queue.add(new ApprovalItem('rej-1', 'github-pr', 'PR', 'Desc'));
      await expect(rejectCmd.execute('rej-1', 'alice', '')).rejects.toThrow('Rejection reason is required');
    });

    it('updates item status to rejected with reason', async () => {
      queue.add(new ApprovalItem('rej-2', 'github-pr', 'PR', 'Desc'));
      await rejectCmd.execute('rej-2', 'bob', 'Security issue found');
      expect(queue.get('rej-2')!.status).toBe('rejected');
      expect(queue.get('rej-2')!.metadata.rejectionReason).toBe('Security issue found');
    });

    it('emits rejection event on EventBus', async () => {
      queue.add(new ApprovalItem('rej-3', 'github-pr', 'PR', 'Desc'));
      const events: any[] = [];
      rejectCmd.onEvent(e => events.push(e));
      await rejectCmd.execute('rej-3', 'carol', 'Does not meet criteria');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('approval.rejected');
      expect(events[0].reason).toBe('Does not meet criteria');
    });
  });
});
