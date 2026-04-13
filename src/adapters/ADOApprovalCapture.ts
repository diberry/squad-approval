import { ApprovalQueue } from '../queue/ApprovalQueue.js';
import { ApprovalItem } from '../models/ApprovalItem.js';

export class ADOApprovalCapture {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  async onWorkItemEscalated(workItemId: string, workItemUrl: string, title: string, priority: string): Promise<ApprovalItem> {
    const item = ApprovalItem.fromADOWorkItem(workItemId, workItemUrl, title, priority);
    this.queue.add(item);
    return item;
  }

  async onApprovalGateTriggered(workItemId: string, workItemUrl: string, gateName: string, title: string): Promise<ApprovalItem> {
    const item = ApprovalItem.fromADOWorkItem(workItemId, workItemUrl, title, `Gate: ${gateName}`);
    item.context.agentReasoning = `Approval gate "${gateName}" triggered for work item ${workItemId}`;
    this.queue.add(item);
    return item;
  }

  async onWorkItemStateChanged(workItemId: string, fromState: string, toState: string): Promise<void> {
    const itemId = `ado-escalation-${workItemId}`;
    const item = this.queue.get(itemId);
    if (!item) return;

    if (toState.toLowerCase() === 'closed' || toState.toLowerCase() === 'resolved') {
      this.queue.approve(itemId, 'ado-system');
    }
  }
}
