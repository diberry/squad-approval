import { ApprovalQueue } from '../../queue/ApprovalQueue.js';
import { ApprovalItem } from '../../models/ApprovalItem.js';

export class InboxCommand {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  formatAge(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  truncateTitle(title: string, maxLen: number = 40): string {
    if (title.length <= maxLen) return title;
    return title.slice(0, maxLen - 3) + '...';
  }

  colorForType(type: string): string {
    const colors: Record<string, string> = {
      'github-pr': '\x1b[34m',     // blue
      'decision': '\x1b[33m',       // yellow
      'ado-escalation': '\x1b[31m', // red
      'policy-waiver': '\x1b[35m',  // magenta
    };
    return colors[type] || '\x1b[0m';
  }

  async list(): Promise<string> {
    const items = this.queue.pending();
    if (items.length === 0) {
      return 'No pending approvals.';
    }

    const header = `${'ID'.padEnd(25)} ${'Type'.padEnd(18)} ${'Title'.padEnd(42)} ${'Age'.padEnd(10)}`;
    const separator = '-'.repeat(95);
    const rows = items.map(item => {
      const color = this.colorForType(item.type);
      const reset = '\x1b[0m';
      return `${item.id.padEnd(25)} ${color}${item.type.padEnd(18)}${reset} ${this.truncateTitle(item.title).padEnd(42)} ${this.formatAge(item.getAge()).padEnd(10)}`;
    });

    return [header, separator, ...rows].join('\n');
  }

  async listJSON(): Promise<string> {
    const items = this.queue.pending();
    const data = items.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      status: item.status,
      age: this.formatAge(item.getAge()),
      createdAt: item.createdAt.toISOString(),
    }));
    return JSON.stringify(data, null, 2);
  }
}
