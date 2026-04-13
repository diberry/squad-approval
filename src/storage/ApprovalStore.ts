import * as fs from 'node:fs';
import * as path from 'node:path';
import { ApprovalItem, ApprovalType, ApprovalStatus, ApprovalItemMetadata, ApprovalItemContext } from '../models/ApprovalItem.js';
import { ApprovalQueue } from '../queue/ApprovalQueue.js';

export interface ApprovalStoreConfig {
  pendingPath: string;
  historyPath: string;
}

interface SerializedItem {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  status: ApprovalStatus;
  createdAt: string;
  expiresAt?: string;
  metadata: ApprovalItemMetadata & { approvedAt?: string; rejectedAt?: string };
  context: ApprovalItemContext;
}

export class ApprovalStore {
  private config: ApprovalStoreConfig;

  constructor(config: ApprovalStoreConfig) {
    this.config = config;
  }

  private serializeItem(item: ApprovalItem): SerializedItem {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      expiresAt: item.expiresAt?.toISOString(),
      metadata: {
        ...item.metadata,
        approvedAt: item.metadata.approvedAt ? (item.metadata.approvedAt as Date).toISOString() : undefined,
        rejectedAt: item.metadata.rejectedAt ? (item.metadata.rejectedAt as Date).toISOString() : undefined,
      } as any,
      context: item.context,
    };
  }

  private deserializeItem(data: SerializedItem): ApprovalItem {
    const item = new ApprovalItem(
      data.id,
      data.type,
      data.title,
      data.description,
      new Date(data.createdAt)
    );
    item.status = data.status;
    if (data.expiresAt) item.expiresAt = new Date(data.expiresAt);
    item.metadata = {
      ...data.metadata,
      approvedAt: data.metadata.approvedAt ? new Date(data.metadata.approvedAt as string) : undefined,
      rejectedAt: data.metadata.rejectedAt ? new Date(data.metadata.rejectedAt as string) : undefined,
    };
    item.context = data.context || {};
    return item;
  }

  async save(queue: ApprovalQueue): Promise<void> {
    const dir = path.dirname(this.config.pendingPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const items = queue.all().filter(i => i.status === 'pending');
    const data = items.map(i => this.serializeItem(i));
    fs.writeFileSync(this.config.pendingPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async load(): Promise<ApprovalQueue> {
    const queue = new ApprovalQueue();
    if (!fs.existsSync(this.config.pendingPath)) {
      return queue;
    }
    const raw = fs.readFileSync(this.config.pendingPath, 'utf-8');
    const data: SerializedItem[] = JSON.parse(raw);
    for (const d of data) {
      queue.add(this.deserializeItem(d));
    }
    return queue;
  }

  async archive(item: ApprovalItem): Promise<void> {
    const dir = this.config.historyPath;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${item.id}-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(this.serializeItem(item), null, 2), 'utf-8');
  }

  async getHistory(limit?: number): Promise<ApprovalItem[]> {
    const dir = this.config.historyPath;
    if (!fs.existsSync(dir)) {
      return [];
    }
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    const filesToRead = limit ? files.slice(0, limit) : files;
    return filesToRead.map(f => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
      return this.deserializeItem(JSON.parse(raw));
    });
  }
}
