import { ApprovalQueue } from '../../queue/ApprovalQueue.js';

export class RejectCommand {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  async execute(id: string, rejecter: string, reason: string): Promise<void> {
    // TODO: Implement `squad inbox reject <id>` command
    // Require --reason flag (mandatory for audit)
    // Update item status to rejected
    // Emit rejection event on SDK EventBus
  }
}
