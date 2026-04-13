import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalAnalytics } from '../../src/analytics/ApprovalAnalytics.js';
import { ApprovalQueue } from '../../src/queue/ApprovalQueue.js';
import { ApprovalItem } from '../../src/models/ApprovalItem.js';

describe('ApprovalAnalytics', () => {
  let queue: ApprovalQueue;
  let analytics: ApprovalAnalytics;

  beforeEach(() => {
    queue = new ApprovalQueue();
    analytics = new ApprovalAnalytics(queue);
  });

  it('medianLatency() calculates average response time', () => {
    // Create items approved at known times
    const item1 = new ApprovalItem('ml-1', 'github-pr', 'PR 1', 'Desc', new Date(Date.now() - 10000));
    const item2 = new ApprovalItem('ml-2', 'github-pr', 'PR 2', 'Desc', new Date(Date.now() - 20000));
    const item3 = new ApprovalItem('ml-3', 'github-pr', 'PR 3', 'Desc', new Date(Date.now() - 30000));
    queue.add(item1);
    queue.add(item2);
    queue.add(item3);
    queue.approve('ml-1', 'a');
    queue.approve('ml-2', 'b');
    queue.approve('ml-3', 'c');

    const latency = analytics.medianLatency();
    expect(latency).toBeGreaterThan(0);
  });

  it('returns milliseconds, convertible to human format', () => {
    const item = new ApprovalItem('ms-1', 'github-pr', 'PR', 'Desc', new Date(Date.now() - 5000));
    queue.add(item);
    queue.approve('ms-1', 'alice');

    const latency = analytics.medianLatency();
    expect(typeof latency).toBe('number');
    expect(latency).toBeGreaterThanOrEqual(4000);
  });

  it('approvalRate() calculates % approved vs rejected', () => {
    queue.add(new ApprovalItem('ar-1', 'github-pr', 'PR 1', 'D'));
    queue.add(new ApprovalItem('ar-2', 'github-pr', 'PR 2', 'D'));
    queue.add(new ApprovalItem('ar-3', 'github-pr', 'PR 3', 'D'));
    queue.add(new ApprovalItem('ar-4', 'github-pr', 'PR 4', 'D')); // stays pending

    queue.approve('ar-1', 'a');
    queue.approve('ar-2', 'a');
    queue.reject('ar-3', 'b', 'no');

    const rate = analytics.approvalRate();
    // 2 approved out of 3 resolved (pending not counted)
    expect(rate).toBeCloseTo(66.67, 0);
  });

  it('topBlockers() identifies items pending > 2 hours', () => {
    const old1 = new ApprovalItem('tb-1', 'github-pr', 'Old 1', 'D', new Date(Date.now() - 10800000)); // 3h
    const old2 = new ApprovalItem('tb-2', 'decision', 'Old 2', 'D', new Date(Date.now() - 7200001)); // 2h+
    const fresh = new ApprovalItem('tb-3', 'github-pr', 'Fresh', 'D');
    queue.add(old1);
    queue.add(old2);
    queue.add(fresh);

    const blockers = analytics.topBlockers();
    expect(blockers).toHaveLength(2);
    expect(blockers[0].id).toBe('tb-1'); // oldest first (sorted by age desc)
  });

  it('getApprovalRateByType() returns per-type rates', () => {
    queue.add(new ApprovalItem('bt-1', 'github-pr', 'PR 1', 'D'));
    queue.add(new ApprovalItem('bt-2', 'github-pr', 'PR 2', 'D'));
    queue.add(new ApprovalItem('bt-3', 'decision', 'Dec 1', 'D'));

    queue.approve('bt-1', 'a');
    queue.reject('bt-2', 'b', 'no');
    queue.approve('bt-3', 'a');

    const rates = analytics.getApprovalRateByType();
    expect(rates['github-pr']).toBe(50); // 1/2
    expect(rates['decision']).toBe(100); // 1/1
  });

  it('getAverageAgeByStatus() compares pending/approved/rejected', () => {
    queue.add(new ApprovalItem('as-1', 'github-pr', 'PR', 'D', new Date(Date.now() - 5000)));
    queue.add(new ApprovalItem('as-2', 'github-pr', 'PR2', 'D', new Date(Date.now() - 3000)));
    queue.approve('as-2', 'a');

    const ages = analytics.getAverageAgeByStatus();
    expect(ages['pending']).toBeGreaterThan(0);
    expect(ages['approved']).toBeGreaterThan(0);
  });

  it('medianLatency() returns 0 for empty queue', () => {
    expect(analytics.medianLatency()).toBe(0);
  });

  it('approvalRate() returns 0 when no resolved items', () => {
    queue.add(new ApprovalItem('nr-1', 'github-pr', 'PR', 'D'));
    expect(analytics.approvalRate()).toBe(0);
  });
});
