import { describe, it, expect } from 'vitest';
import { ApprovalStore } from '../../src/storage/ApprovalStore.js';
import { ApprovalQueue } from '../../src/queue/ApprovalQueue.js';

describe('ApprovalStore', () => {
  it('save() writes queue to .squad/approvals/pending.json', async () => {
    // TODO: Test file I/O persistence
  });

  it('load() reads from disk and restores queue', async () => {
    // TODO: Test queue restoration from disk
  });

  it('archive(id) moves approved/rejected items to history/', async () => {
    // TODO: Test archival workflow
  });

  it('getHistory() retrieves archived items', async () => {
    // TODO: Test history retrieval
  });

  it('handles missing files gracefully', async () => {
    // TODO: Test error handling for non-existent files
  });
});
