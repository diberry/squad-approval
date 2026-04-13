import { ApprovalQueue } from '../queue/ApprovalQueue.js';
import { ApprovalItem } from '../models/ApprovalItem.js';

export interface PREvent {
  prNumber: number;
  prUrl: string;
  title: string;
  body: string;
  diffSummary?: string;
  labels?: string[];
}

export class GitHubApprovalCapture {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  async onPROpened(prNumber: number, prUrl: string, title: string, body: string, diffSummary?: string): Promise<ApprovalItem> {
    const item = ApprovalItem.fromGitHubPR(prNumber, prUrl, title, body);
    if (diffSummary) {
      item.context.affectedFiles = [diffSummary];
    }
    this.queue.add(item);
    return item;
  }

  async onPRLabeled(prNumber: number, prUrl: string, title: string, body: string, label: string): Promise<ApprovalItem | null> {
    if (label !== 'needs-approval') {
      return null;
    }
    const existingId = `github-pr-${prNumber}`;
    const existing = this.queue.get(existingId);
    if (existing) {
      return existing;
    }
    const item = ApprovalItem.fromGitHubPR(prNumber, prUrl, title, body);
    this.queue.add(item);
    return item;
  }

  async onPRCommented(prNumber: number, commentBody: string, commenter: string): Promise<void> {
    const itemId = `github-pr-${prNumber}`;
    const item = this.queue.get(itemId);
    if (!item) return;

    const lowerBody = commentBody.toLowerCase().trim();
    if (lowerBody.startsWith('/approve')) {
      this.queue.approve(itemId, commenter);
    } else if (lowerBody.startsWith('/reject')) {
      const reason = commentBody.replace(/^\/reject\s*/i, '').trim() || 'Rejected via PR comment';
      this.queue.reject(itemId, commenter, reason);
    }
  }
}
