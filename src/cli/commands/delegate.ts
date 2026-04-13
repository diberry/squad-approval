import { ApprovalQueue } from '../../queue/ApprovalQueue.js';

export class DelegateCommand {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  async execute(id: string, delegateTo: string): Promise<void> {
    // TODO: Implement `squad inbox delegate <id> --to=@person` command
    // Store delegated_to field
    // Send notification to assignee
  }
}
