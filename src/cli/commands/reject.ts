import { ApprovalQueue } from '../../queue/ApprovalQueue.js';

export interface RejectionEvent {
  type: 'approval.rejected';
  itemId: string;
  rejecter: string;
  reason: string;
  timestamp: Date;
}

export type EventHandler = (event: RejectionEvent) => void;

export class RejectCommand {
  private queue: ApprovalQueue;
  private eventHandlers: EventHandler[] = [];

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  onEvent(handler: EventHandler): void {
    this.eventHandlers.push(handler);
  }

  private emitEvent(event: RejectionEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  async execute(id: string, rejecter: string, reason: string): Promise<void> {
    if (!reason || reason.trim() === '') {
      throw new Error('Rejection reason is required (--reason flag)');
    }
    this.queue.reject(id, rejecter, reason);
    this.emitEvent({
      type: 'approval.rejected',
      itemId: id,
      rejecter,
      reason,
      timestamp: new Date(),
    });
  }
}
