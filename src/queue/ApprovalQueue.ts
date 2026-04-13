import { ApprovalItem, ApprovalStatus } from '../models/ApprovalItem.js';

export class ApprovalQueue {
  private items: Map<string, ApprovalItem> = new Map();

  add(item: ApprovalItem): number {
    if (this.items.has(item.id)) {
      throw new Error(`Approval item with id ${item.id} already exists`);
    }
    this.items.set(item.id, item);
    return this.items.size;
  }

  get(id: string): ApprovalItem | undefined {
    return this.items.get(id);
  }

  pending(): ApprovalItem[] {
    return Array.from(this.items.values())
      .filter(item => item.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  approved(): ApprovalItem[] {
    return Array.from(this.items.values())
      .filter(item => item.status === 'approved')
      .sort((a, b) => (b.metadata.approvedAt?.getTime() ?? 0) - (a.metadata.approvedAt?.getTime() ?? 0));
  }

  rejected(): ApprovalItem[] {
    return Array.from(this.items.values())
      .filter(item => item.status === 'rejected')
      .sort((a, b) => (b.metadata.rejectedAt?.getTime() ?? 0) - (a.metadata.rejectedAt?.getTime() ?? 0));
  }

  expired(): ApprovalItem[] {
    return Array.from(this.items.values())
      .filter(item => item.status === 'expired');
  }

  approve(id: string, approver: string): ApprovalItem {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Approval item ${id} not found`);
    }
    item.approve(approver);
    return item;
  }

  reject(id: string, rejecter: string, reason: string): ApprovalItem {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Approval item ${id} not found`);
    }
    item.reject(rejecter, reason);
    return item;
  }

  expire(id: string): ApprovalItem {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Approval item ${id} not found`);
    }
    item.expire();
    return item;
  }

  expireStale(thresholdMs: number = 86400000): ApprovalItem[] {
    const staleItems = Array.from(this.items.values()).filter(item => item.isStale(thresholdMs));
    staleItems.forEach(item => item.expire());
    return staleItems;
  }

  sortByPriority(): ApprovalItem[] {
    const pending = this.pending();
    return pending.sort((a, b) => {
      const aStale = a.isStale();
      const bStale = b.isStale();
      if (aStale && !bStale) return -1;
      if (!aStale && bStale) return 1;

      const priorityOrder: Record<string, number> = {
        'ado-escalation': 1,
        'decision': 2,
        'policy-waiver': 3,
        'github-pr': 4,
      };
      const aPriority = priorityOrder[a.type] ?? 99;
      const bPriority = priorityOrder[b.type] ?? 99;
      if (aPriority !== bPriority) return aPriority - bPriority;

      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  size(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  all(): ApprovalItem[] {
    return Array.from(this.items.values());
  }
}
