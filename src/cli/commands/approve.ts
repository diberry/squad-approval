import { ApprovalQueue } from '../../queue/ApprovalQueue.js';

export interface ApprovalEvent {
  type: 'approval.approved';
  itemId: string;
  approver: string;
  reason?: string;
  timestamp: Date;
}

export type EventHandler = (event: ApprovalEvent) => void;

export class ApproveCommand {
  private queue: ApprovalQueue;
  private eventHandlers: EventHandler[] = [];

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  onEvent(handler: EventHandler): void {
    this.eventHandlers.push(handler);
  }

  private emitEvent(event: ApprovalEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  async execute(id: string, approver: string, reason?: string): Promise<void> {
    const item = this.queue.approve(id, approver);
    if (reason) {
      item.metadata.rejectionReason = reason; // reuse field for approval reason
    }
    this.emitEvent({
      type: 'approval.approved',
      itemId: id,
      approver,
      reason,
      timestamp: new Date(),
    });
  }
}
