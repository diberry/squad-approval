import { ApprovalQueue } from '../../queue/ApprovalQueue.js';

export class DelegateCommand {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  async execute(id: string, delegateTo: string): Promise<void> {
    const item = this.queue.get(id);
    if (!item) {
      throw new Error(`Approval item ${id} not found`);
    }
    item.metadata.delegatedTo = delegateTo;
  }
}
