import { ApprovalQueue } from '../queue/ApprovalQueue.js';
import { ApprovalItem } from '../models/ApprovalItem.js';

export class DecisionApprovalCapture {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  async onDecisionInbox(filePath: string, title: string, agentReasoning: string): Promise<ApprovalItem> {
    // TODO: Watch .squad/decisions/inbox/ for new files
    // Parse decision file to extract context
    const item = ApprovalItem.fromDecisionFile(filePath, title, agentReasoning);
    this.queue.add(item);
    return item;
  }

  async onDecisionMoved(fromPath: string, toPath: string): Promise<void> {
    // TODO: When decision moved from inbox/ to approved/
    // Update corresponding queue item status
  }

  async onDecisionApproved(filePath: string): Promise<void> {
    // TODO: Mark decision-based items as approved when file moved to decisions/approved/
  }
}
