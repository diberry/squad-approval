import { ApprovalQueue } from '../queue/ApprovalQueue.js';
import { ApprovalItem } from '../models/ApprovalItem.js';

export class GitHubApprovalCapture {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  async onPROpened(prNumber: number, prUrl: string, title: string, body: string): Promise<ApprovalItem> {
    // TODO: Create ApprovalItem from GitHub PR event
    // Extract PR context (diff summary, reviewers, etc.)
    const item = ApprovalItem.fromGitHubPR(prNumber, prUrl, title, body);
    this.queue.add(item);
    return item;
  }

  async onPRLabeled(prNumber: number, label: string): Promise<ApprovalItem | null> {
    // TODO: Watch for 'needs-approval' label on PR
    // Create or update ApprovalItem if label applied
    return null;
  }

  async onPRCommented(prNumber: number, commentBody: string): Promise<void> {
    // TODO: Listen for approval/rejection comments
    // Trigger approve/reject on queue item
  }
}
