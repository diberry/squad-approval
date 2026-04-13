import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalQueue } from '../../src/queue/ApprovalQueue.js';
import { ApprovalItem } from '../../src/models/ApprovalItem.js';

describe('ApprovalQueue', () => {
  let queue: ApprovalQueue;

  beforeEach(() => {
    queue = new ApprovalQueue();
  });

  it('add() inserts item and returns queue size', () => {
    const item = new ApprovalItem('q-1', 'github-pr', 'PR 1', 'Desc');
    const size = queue.add(item);
    expect(size).toBe(1);
    expect(queue.get('q-1')).toBe(item);

    const item2 = new ApprovalItem('q-2', 'decision', 'Decision 1', 'Desc');
    const size2 = queue.add(item2);
    expect(size2).toBe(2);
  });

  it('add() throws on duplicate id', () => {
    const item1 = new ApprovalItem('dup-1', 'github-pr', 'PR', 'Desc');
    const item2 = new ApprovalItem('dup-1', 'github-pr', 'PR dup', 'Desc');
    queue.add(item1);
    expect(() => queue.add(item2)).toThrow('already exists');
  });

  it('pending() returns only items with status=pending', () => {
    const item1 = new ApprovalItem('p-1', 'github-pr', 'PR 1', 'Desc', new Date(Date.now() - 2000));
    const item2 = new ApprovalItem('p-2', 'decision', 'Decision', 'Desc', new Date(Date.now() - 1000));
    const item3 = new ApprovalItem('p-3', 'github-pr', 'PR 2', 'Desc');

    queue.add(item1);
    queue.add(item2);
    queue.add(item3);
    queue.approve('p-3', 'alice');

    const pending = queue.pending();
    expect(pending).toHaveLength(2);
    expect(pending[0].id).toBe('p-1'); // oldest first
    expect(pending[1].id).toBe('p-2');
  });

  it('approve(id) updates status and records approver', () => {
    const item = new ApprovalItem('a-1', 'github-pr', 'PR', 'Desc');
    queue.add(item);
    const result = queue.approve('a-1', 'alice');
    expect(result.status).toBe('approved');
    expect(result.metadata.approvedBy).toBe('alice');
    expect(result.metadata.approvedAt).toBeInstanceOf(Date);
  });

  it('reject(id, reason) stores rejection reason', () => {
    const item = new ApprovalItem('r-1', 'github-pr', 'PR', 'Desc');
    queue.add(item);
    const result = queue.reject('r-1', 'bob', 'Security concern');
    expect(result.status).toBe('rejected');
    expect(result.metadata.rejectedBy).toBe('bob');
    expect(result.metadata.rejectionReason).toBe('Security concern');
  });

  it('expire(id) marks stale items', () => {
    const item = new ApprovalItem('e-1', 'github-pr', 'PR', 'Desc');
    queue.add(item);
    const result = queue.expire('e-1');
    expect(result.status).toBe('expired');
  });

  it('expireStale() identifies items > 1 hour old', () => {
    const oldItem = new ApprovalItem('es-1', 'github-pr', 'Old', 'Desc', new Date(Date.now() - 7200000));
    const freshItem = new ApprovalItem('es-2', 'github-pr', 'Fresh', 'Desc');
    queue.add(oldItem);
    queue.add(freshItem);

    const expired = queue.expireStale(3600000);
    expect(expired).toHaveLength(1);
    expect(expired[0].id).toBe('es-1');
    expect(expired[0].status).toBe('expired');
    expect(queue.get('es-2')!.status).toBe('pending');
  });

  it('sortByPriority() returns P0 items first', () => {
    const pr = new ApprovalItem('sp-1', 'github-pr', 'PR', 'Desc', new Date(Date.now() - 100));
    const decision = new ApprovalItem('sp-2', 'decision', 'Decision', 'Desc', new Date(Date.now() - 200));
    const escalation = new ApprovalItem('sp-3', 'ado-escalation', 'Escalation', 'Desc', new Date(Date.now() - 50));

    queue.add(pr);
    queue.add(decision);
    queue.add(escalation);

    const sorted = queue.sortByPriority();
    expect(sorted[0].id).toBe('sp-3'); // ado-escalation = highest priority
    expect(sorted[1].id).toBe('sp-2'); // decision = second
    expect(sorted[2].id).toBe('sp-1'); // github-pr = lowest
  });

  it('size() returns total items in queue', () => {
    expect(queue.size()).toBe(0);
    queue.add(new ApprovalItem('sz-1', 'github-pr', 'PR', 'Desc'));
    expect(queue.size()).toBe(1);
    queue.add(new ApprovalItem('sz-2', 'decision', 'Dec', 'Desc'));
    expect(queue.size()).toBe(2);
  });

  it('clear() removes all items', () => {
    queue.add(new ApprovalItem('cl-1', 'github-pr', 'PR', 'Desc'));
    queue.add(new ApprovalItem('cl-2', 'decision', 'Dec', 'Desc'));
    expect(queue.size()).toBe(2);
    queue.clear();
    expect(queue.size()).toBe(0);
    expect(queue.pending()).toHaveLength(0);
  });
});
