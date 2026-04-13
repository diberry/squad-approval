import { ApprovalItem } from '../models/ApprovalItem.js';
import { ApprovalQueue } from './ApprovalQueue.js';

export interface ApprovalStoreConfig {
  pendingPath: string;
  historyPath: string;
}

export class ApprovalStore {
  private config: ApprovalStoreConfig;

  constructor(config: ApprovalStoreConfig) {
    this.config = config;
  }

  async save(queue: ApprovalQueue): Promise<void> {
    // TODO: Implement file I/O to persist queue to .squad/approvals/pending.json
    // This will integrate with SDK's StorageProvider
  }

  async load(): Promise<ApprovalQueue> {
    // TODO: Implement file I/O to load queue from disk
    // Returns new ApprovalQueue populated from storage
    return new ApprovalQueue();
  }

  async archive(item: ApprovalItem): Promise<void> {
    // TODO: Move approved/rejected items to history/
    // Store with timestamp and resolution status
  }

  async getHistory(limit?: number): Promise<ApprovalItem[]> {
    // TODO: Load archived items from history directory
    return [];
  }
}
