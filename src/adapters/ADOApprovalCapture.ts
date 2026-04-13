import { ApprovalQueue } from '../queue/ApprovalQueue.js';
import { ApprovalItem } from '../models/ApprovalItem.js';

export class ADOApprovalCapture {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  async onWorkItemEscalated(workItemId: string, workItemUrl: string, title: string, priority: string): Promise<ApprovalItem> {
    // TODO: Listen to ADO work item state changes
    // Create ApprovalItem for escalated items
    const item = ApprovalItem.fromADOWorkItem(workItemId, workItemUrl, title, priority);
    this.queue.add(item);
    return item;
  }

  async onApprovalGateTriggered(workItemId: string, gateName: string): Promise<ApprovalItem | null> {
    // TODO: Integrate with SDK's HookPipeline
    // Create item when approval gate triggered
    return null;
  }

  async onWorkItemStateChanged(workItemId: string, fromState: string, toState: string): Promise<void> {
    // TODO: Track state transitions for approval workflow
  }
}
