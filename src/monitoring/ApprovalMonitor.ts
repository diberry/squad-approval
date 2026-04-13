import { ApprovalQueue } from '../queue/ApprovalQueue.js';
import { ApprovalItem } from '../models/ApprovalItem.js';

export interface StaleItemReport {
  item: ApprovalItem;
  reason: string;
  ageMs: number;
}

export interface NotificationSender {
  send(message: string): Promise<void>;
}

export class ApprovalMonitor {
  private queue: ApprovalQueue;
  private staleThresholdMs: number;
  private intervalMs: number;
  private notifier?: NotificationSender;
  private lastEscalation: StaleItemReport[] = [];

  constructor(queue: ApprovalQueue, staleThresholdMs: number = 3600000, intervalMs: number = 3600000) {
    this.queue = queue;
    this.staleThresholdMs = staleThresholdMs;
    this.intervalMs = intervalMs;
  }

  setNotifier(notifier: NotificationSender): void {
    this.notifier = notifier;
  }

  getIntervalMs(): number {
    return this.intervalMs;
  }

  checkStale(): StaleItemReport[] {
    const pendingItems = this.queue.pending();
    const staleItems = pendingItems.filter(item => item.isStale(this.staleThresholdMs));
    return staleItems.map(item => ({
      item,
      reason: `Item has been pending for ${Math.floor(item.getAge() / 60000)} minutes (threshold: ${Math.floor(this.staleThresholdMs / 60000)} minutes)`,
      ageMs: item.getAge(),
    }));
  }

  async escalateStale(): Promise<StaleItemReport[]> {
    const staleReports = this.checkStale();
    this.lastEscalation = staleReports;

    if (this.notifier && staleReports.length > 0) {
      for (const report of staleReports) {
        const message = `⚠️ Stale approval: [${report.item.id}] "${report.item.title}" - ${report.reason}`;
        await this.notifier.send(message);
      }
    }

    return staleReports;
  }

  async runCheck(): Promise<StaleItemReport[]> {
    return this.escalateStale();
  }

  getLastEscalation(): StaleItemReport[] {
    return this.lastEscalation;
  }
}
