import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ApprovalStore } from '../../src/storage/ApprovalStore.js';
import { ApprovalQueue } from '../../src/queue/ApprovalQueue.js';
import { ApprovalItem } from '../../src/models/ApprovalItem.js';

const TEST_DIR = path.join(process.cwd(), '.test-approvals');
const PENDING_PATH = path.join(TEST_DIR, 'pending.json');
const HISTORY_PATH = path.join(TEST_DIR, 'history');

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe('ApprovalStore', () => {
  let store: ApprovalStore;

  beforeEach(() => {
    cleanup();
    store = new ApprovalStore({ pendingPath: PENDING_PATH, historyPath: HISTORY_PATH });
  });

  afterEach(() => {
    cleanup();
  });

  it('save() writes queue to .squad/approvals/pending.json', async () => {
    const queue = new ApprovalQueue();
    queue.add(new ApprovalItem('s-1', 'github-pr', 'PR 1', 'Desc'));
    queue.add(new ApprovalItem('s-2', 'decision', 'Decision 1', 'Desc'));

    await store.save(queue);

    expect(fs.existsSync(PENDING_PATH)).toBe(true);
    const data = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf-8'));
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('s-1');
    expect(data[1].id).toBe('s-2');
  });

  it('load() reads from disk and restores queue', async () => {
    const queue = new ApprovalQueue();
    queue.add(new ApprovalItem('l-1', 'github-pr', 'PR', 'Desc'));
    queue.add(new ApprovalItem('l-2', 'decision', 'Dec', 'Desc'));
    await store.save(queue);

    const loaded = await store.load();
    expect(loaded.pending()).toHaveLength(2);
    expect(loaded.get('l-1')!.title).toBe('PR');
    expect(loaded.get('l-2')!.type).toBe('decision');
  });

  it('archive(id) moves approved/rejected items to history/', async () => {
    const item = new ApprovalItem('a-1', 'github-pr', 'PR', 'Desc');
    item.approve('alice');

    await store.archive(item);

    expect(fs.existsSync(HISTORY_PATH)).toBe(true);
    const files = fs.readdirSync(HISTORY_PATH);
    expect(files.length).toBe(1);
    expect(files[0]).toContain('a-1');

    const raw = JSON.parse(fs.readFileSync(path.join(HISTORY_PATH, files[0]), 'utf-8'));
    expect(raw.status).toBe('approved');
    expect(raw.metadata.approvedBy).toBe('alice');
  });

  it('getHistory() retrieves archived items', async () => {
    const item1 = new ApprovalItem('h-1', 'github-pr', 'PR 1', 'Desc');
    item1.approve('alice');
    const item2 = new ApprovalItem('h-2', 'decision', 'Dec 1', 'Desc');
    item2.reject('bob', 'No good');

    await store.archive(item1);
    // small delay to ensure different filenames
    await new Promise(r => setTimeout(r, 5));
    await store.archive(item2);

    const history = await store.getHistory();
    expect(history).toHaveLength(2);
  });

  it('handles missing files gracefully', async () => {
    const loaded = await store.load();
    expect(loaded.pending()).toHaveLength(0);
    expect(loaded.size()).toBe(0);

    const history = await store.getHistory();
    expect(history).toHaveLength(0);
  });
});
