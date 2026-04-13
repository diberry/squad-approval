import { ApprovalQueue } from '../queue/ApprovalQueue.js';
import { ApprovalItem } from '../models/ApprovalItem.js';

export class DecisionApprovalCapture {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  async onDecisionInbox(filePath: string, title: string, agentReasoning: string): Promise<ApprovalItem> {
    const item = ApprovalItem.fromDecisionFile(filePath, title, agentReasoning);
    this.queue.add(item);
    return item;
  }

  async onDecisionMoved(itemId: string, toPath: string): Promise<void> {
    const item = this.queue.get(itemId);
    if (!item) return;

    if (toPath.includes('approved')) {
      this.queue.approve(itemId, 'system');
    } else if (toPath.includes('rejected')) {
      this.queue.reject(itemId, 'system', 'Decision file moved to rejected');
    }
  }

  async onDecisionApproved(itemId: string, approver: string = 'system'): Promise<void> {
    const item = this.queue.get(itemId);
    if (!item) return;
    this.queue.approve(itemId, approver);
  }
}
