import { ApprovalQueue } from '../queue/ApprovalQueue.js';
import { ApprovalItem } from '../models/ApprovalItem.js';

export class ApprovalMonitor {
  private queue: ApprovalQueue;
  private staleThresholdMs: number = 3600000; // 1 hour

  constructor(queue: ApprovalQueue, staleThresholdMs?: number) {
    this.queue = queue;
    if (staleThresholdMs) {
      this.staleThresholdMs = staleThresholdMs;
    }
  }

  checkStale(): ApprovalItem[] {
    // TODO: Identify items > 1 hour old
    // Return list of stale items with reason
    return this.queue.pending().filter(item => item.isStale(this.staleThresholdMs));
  }

  async escalateStale(): Promise<void> {
    // TODO: Send notification via comms adapter
    // Include item summary and approval link
  }

  async runCheck(): Promise<void> {
    // TODO: Can be registered as Ralph monitor task
    // Runs on configured interval (default 1h)
  }
}
