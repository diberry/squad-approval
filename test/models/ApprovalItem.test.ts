import { describe, it, expect } from 'vitest';
import { ApprovalItem } from '../../src/models/ApprovalItem.js';

describe('ApprovalItem', () => {
  it('stores id, type, status, created_at, expires_at', () => {
    const now = new Date();
    const item = new ApprovalItem('test-1', 'github-pr', 'Test PR', 'Description', now);
    expect(item.id).toBe('test-1');
    expect(item.type).toBe('github-pr');
    expect(item.status).toBe('pending');
    expect(item.createdAt).toBe(now);
    expect(item.title).toBe('Test PR');
    expect(item.description).toBe('Description');
    expect(item.metadata).toEqual({});
    expect(item.context).toEqual({});
  });

  it('ApprovalItem.from_github_pr creates item with PR context', () => {
    const item = ApprovalItem.fromGitHubPR(42, 'https://github.com/test/repo/pull/42', 'Fix bug', 'Fixes the login issue');
    expect(item.id).toBe('github-pr-42');
    expect(item.type).toBe('github-pr');
    expect(item.title).toBe('Fix bug');
    expect(item.description).toBe('Fixes the login issue');
    expect(item.metadata.githubPRNumber).toBe(42);
    expect(item.metadata.githubPRUrl).toBe('https://github.com/test/repo/pull/42');
    expect(item.status).toBe('pending');
  });

  it('ApprovalItem.from_decision_file creates item with decision context', () => {
    const item = ApprovalItem.fromDecisionFile(
      '.squad/decisions/inbox/use-redis.md',
      'Use Redis for caching',
      'Agent determined Redis provides better performance for our use case'
    );
    expect(item.type).toBe('decision');
    expect(item.title).toBe('Use Redis for caching');
    expect(item.metadata.decisionPath).toBe('.squad/decisions/inbox/use-redis.md');
    expect(item.context.agentReasoning).toBe('Agent determined Redis provides better performance for our use case');
    expect(item.status).toBe('pending');
  });

  it('ApprovalItem.context() returns agent reasoning, affected files, related decisions', () => {
    const item = new ApprovalItem('ctx-1', 'decision', 'Test', 'Desc');
    item.context.agentReasoning = 'This is the reasoning';
    item.context.affectedFiles = ['src/auth.ts', 'src/db.ts'];
    item.context.relatedDecisions = ['decision-001', 'decision-002'];

    const ctx = item.getContext();
    expect(ctx.agentReasoning).toBe('This is the reasoning');
    expect(ctx.affectedFiles).toEqual(['src/auth.ts', 'src/db.ts']);
    expect(ctx.relatedDecisions).toEqual(['decision-001', 'decision-002']);
  });

  it('approve() updates status and records approver', () => {
    const item = new ApprovalItem('app-1', 'github-pr', 'PR', 'Desc');
    expect(item.status).toBe('pending');
    item.approve('alice');
    expect(item.status).toBe('approved');
    expect(item.metadata.approvedBy).toBe('alice');
    expect(item.metadata.approvedAt).toBeInstanceOf(Date);
  });

  it('reject() stores rejection reason', () => {
    const item = new ApprovalItem('rej-1', 'github-pr', 'PR', 'Desc');
    item.reject('bob', 'Not aligned with architecture');
    expect(item.status).toBe('rejected');
    expect(item.metadata.rejectedBy).toBe('bob');
    expect(item.metadata.rejectedAt).toBeInstanceOf(Date);
    expect(item.metadata.rejectionReason).toBe('Not aligned with architecture');
  });

  it('isStale() detects items older than threshold', () => {
    const oldDate = new Date(Date.now() - 7200000); // 2 hours ago
    const item = new ApprovalItem('stale-1', 'github-pr', 'Old PR', 'Desc', oldDate);
    expect(item.isStale(3600000)).toBe(true); // 1hr threshold
    expect(item.isStale(10800000)).toBe(false); // 3hr threshold

    const freshItem = new ApprovalItem('fresh-1', 'github-pr', 'Fresh PR', 'Desc');
    expect(freshItem.isStale(3600000)).toBe(false);
  });

  it('getAge() returns elapsed time in milliseconds', () => {
    const past = new Date(Date.now() - 5000);
    const item = new ApprovalItem('age-1', 'github-pr', 'PR', 'Desc', past);
    const age = item.getAge();
    expect(age).toBeGreaterThanOrEqual(4900);
    expect(age).toBeLessThan(10000);
  });

  it('isStale() returns false for non-pending items', () => {
    const oldDate = new Date(Date.now() - 7200000);
    const item = new ApprovalItem('stale-2', 'github-pr', 'PR', 'Desc', oldDate);
    item.approve('alice');
    expect(item.isStale(3600000)).toBe(false);
  });
});
