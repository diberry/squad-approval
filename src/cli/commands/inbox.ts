import { ApprovalQueue } from '../../queue/ApprovalQueue.js';

export class InboxCommand {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  async list(): Promise<void> {
    // TODO: Implement `squad inbox` command
    // List pending approvals in table format
    // Columns: id, type, title, age, status
  }

  async listJSON(): Promise<string> {
    // TODO: Return pending items as JSON
    // Useful for scripting and programmatic access
    return '[]';
  }
}
