import { ApprovalQueue } from '../queue/ApprovalQueue.js';
import { ApprovalItem } from '../models/ApprovalItem.js';

export class ApprovalAnalytics {
  private queue: ApprovalQueue;

  constructor(queue: ApprovalQueue) {
    this.queue = queue;
  }

  medianLatency(): number {
    const approved = this.queue.approved();
    if (approved.length === 0) return 0;

    const latencies = approved
      .filter(item => item.metadata.approvedAt)
      .map(item => (item.metadata.approvedAt as Date).getTime() - item.createdAt.getTime())
      .sort((a, b) => a - b);

    if (latencies.length === 0) return 0;
    const mid = Math.floor(latencies.length / 2);
    if (latencies.length % 2 === 0) {
      return (latencies[mid - 1] + latencies[mid]) / 2;
    }
    return latencies[mid];
  }

  approvalRate(): number {
    const all = this.queue.all();
    const resolved = all.filter(i => i.status === 'approved' || i.status === 'rejected');
    if (resolved.length === 0) return 0;
    const approvedCount = resolved.filter(i => i.status === 'approved').length;
    return (approvedCount / resolved.length) * 100;
  }

  topBlockers(thresholdMs: number = 7200000): ApprovalItem[] {
    return this.queue.pending()
      .filter(item => item.getAge() > thresholdMs)
      .sort((a, b) => b.getAge() - a.getAge());
  }

  getApprovalRateByType(): Record<string, number> {
    const all = this.queue.all();
    const byType: Record<string, { approved: number; total: number }> = {};

    for (const item of all) {
      if (item.status !== 'approved' && item.status !== 'rejected') continue;
      if (!byType[item.type]) byType[item.type] = { approved: 0, total: 0 };
      byType[item.type].total++;
      if (item.status === 'approved') byType[item.type].approved++;
    }

    const result: Record<string, number> = {};
    for (const [type, stats] of Object.entries(byType)) {
      result[type] = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;
    }
    return result;
  }

  getAverageAgeByStatus(): Record<string, number> {
    const all = this.queue.all();
    const byStatus: Record<string, { totalAge: number; count: number }> = {};

    for (const item of all) {
      if (!byStatus[item.status]) byStatus[item.status] = { totalAge: 0, count: 0 };
      byStatus[item.status].totalAge += item.getAge();
      byStatus[item.status].count++;
    }

    const result: Record<string, number> = {};
    for (const [status, stats] of Object.entries(byStatus)) {
      result[status] = stats.count > 0 ? stats.totalAge / stats.count : 0;
    }
    return result;
  }
}
