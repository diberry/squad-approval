import { describe, it, expect } from 'vitest';
import { ApprovalItem } from '../../src/models/ApprovalItem.js';

describe('ApprovalItem', () => {
  it('stores id, type, status, created_at, expires_at', () => {
    // TODO: Test basic construction and field storage
  });

  it('ApprovalItem.from_github_pr creates item with PR context', () => {
    // TODO: Test factory method extracts PR number, title, URL
  });

  it('ApprovalItem.from_decision_file creates item with decision context', () => {
    // TODO: Test reads decision file, extracts agent reasoning, status
  });

  it('ApprovalItem.context() returns agent reasoning, affected files, related decisions', () => {
    // TODO: Test context aggregation
  });

  it('approve() updates status and records approver', () => {
    // TODO: Test approval state transition
  });

  it('reject() stores rejection reason', () => {
    // TODO: Test rejection state transition with reason
  });

  it('isStale() detects items older than threshold', () => {
    // TODO: Test stale detection logic
  });

  it('getAge() returns elapsed time in milliseconds', () => {
    // TODO: Test age calculation
  });
});
