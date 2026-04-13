import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalMonitor, NotificationSender } from '../../src/monitoring/ApprovalMonitor.js';
import { ApprovalQueue } from '../../src/queue/ApprovalQueue.js';
import { ApprovalItem } from '../../src/models/ApprovalItem.js';

describe('ApprovalMonitor', () => {
  let queue: ApprovalQueue;
  let monitor: ApprovalMonitor;

  beforeEach(() => {
    queue = new ApprovalQueue();
  });

  it('checkStale() identifies items > 1 hour old', () => {
    monitor = new ApprovalMonitor(queue, 3600000);
    const oldItem = new ApprovalItem('m-1', 'github-pr', 'Old PR', 'Desc', new Date(Date.now() - 7200000));
    const freshItem = new ApprovalItem('m-2', 'github-pr', 'Fresh PR', 'Desc');
    queue.add(oldItem);
    queue.add(freshItem);

    const stale = monitor.checkStale();
    expect(stale).toHaveLength(1);
    expect(stale[0].item.id).toBe('m-1');
  });

  it('returns list of stale items with reason', () => {
    monitor = new ApprovalMonitor(queue, 3600000);
    const oldItem = new ApprovalItem('m-3', 'github-pr', 'Old PR', 'Desc', new Date(Date.now() - 5400000));
    queue.add(oldItem);

    const stale = monitor.checkStale();
    expect(stale).toHaveLength(1);
    expect(stale[0].reason).toContain('pending');
    expect(stale[0].ageMs).toBeGreaterThan(5000000);
  });

  it('escalateStale() sends notification via comms adapter', async () => {
    monitor = new ApprovalMonitor(queue, 3600000);
    const messages: string[] = [];
    const notifier: NotificationSender = { send: async (msg) => { messages.push(msg); } };
    monitor.setNotifier(notifier);

    queue.add(new ApprovalItem('m-4', 'github-pr', 'Stale PR', 'Desc', new Date(Date.now() - 7200000)));

    await monitor.escalateStale();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('Stale approval');
    expect(messages[0]).toContain('m-4');
  });

  it('includes item summary and approval link in notification', async () => {
    monitor = new ApprovalMonitor(queue, 3600000);
    const messages: string[] = [];
    monitor.setNotifier({ send: async (msg) => { messages.push(msg); } });

    queue.add(new ApprovalItem('m-5', 'decision', 'Architecture decision', 'Desc', new Date(Date.now() - 7200000)));
    await monitor.escalateStale();

    expect(messages[0]).toContain('Architecture decision');
    expect(messages[0]).toContain('m-5');
  });

  it('can be registered as Ralph monitor task', async () => {
    monitor = new ApprovalMonitor(queue, 3600000);
    // runCheck returns stale reports, simulating Ralph task execution
    queue.add(new ApprovalItem('m-6', 'github-pr', 'PR', 'Desc', new Date(Date.now() - 7200000)));
    const result = await monitor.runCheck();
    expect(result).toHaveLength(1);
  });

  it('runs on configured interval (default 1h)', () => {
    monitor = new ApprovalMonitor(queue);
    expect(monitor.getIntervalMs()).toBe(3600000);

    const customMonitor = new ApprovalMonitor(queue, 1800000, 1800000);
    expect(customMonitor.getIntervalMs()).toBe(1800000);
  });
});
