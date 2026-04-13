import { ApprovalQueue } from '../queue/ApprovalQueue.js';
import { ApprovalItem } from '../models/ApprovalItem.js';

export class ApprovalAnalytics {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  medianLatency(): number {
    // TODO: Calculate (approved_at - created_at) for all approved items
    // Return milliseconds
    return 0;
  }

  approvalRate(): number {
    // TODO: Return (approved_count / total_count)
    // As percentage
    return 0;
  }

  topBlockers(): ApprovalItem[] {
    // TODO: Return items pending > 2 hours, sorted by age
    return [];
  }

  getApprovalRateByType(): Record<string, number> {
    // TODO: Return approval rates per item type
    return {};
  }

  getAverageAgeByStatus(): Record<string, number> {
    // TODO: Return average age for pending, approved, rejected items
    return {};
  }
}
