# Squad SDK Example: Human Approval & Escalation Hub

A unified approval inbox built on [Squad SDK](https://github.com/bradygaster/squad-sdk) that collects agent proposals requiring human sign-off (PR approvals, architecture decisions, budget overruns, policy waivers) into a single interface with threaded context and audit trails.

## Using This Example

### Install & Build

```bash
git clone <repo-url>
cd project-squad-sdk-example-approval
npm install
npm run build
npm link   # makes the 'squad-approval' command available globally
npm test
```

### Configure the Approval Queue

Approvals are stored in `.squad/approvals/`:

```
.squad/
├── approvals/
│   ├── pending.json           # Current pending items
│   └── history/
│       ├── 2024-01-15.json    # Approved/rejected items
│       └── ...
```

Default approval timeout is **24 hours**; items automatically marked `expired` after this period. Stale detection threshold (default **1 hour**) escalates old items to the top of the queue.

### Submit an Approval Request

```bash
squad-approval create --type decision --title "Use JWT for auth" --agent keaton --reason "Auth decision needed"
```

**Expected output:**
```
✓ Created approval: decision-1705328000000
  Type:  decision
  Title: Use JWT for auth
```

### List Pending Approvals

```bash
squad-approval list
```

**Expected output:**
```
ID                        Type               Title                              Age
─────────────────────────────────────────────────────────────────────────────────
decision-1705328000000    decision           Use JWT for auth                   1m

Total: 1 pending approval
```

### Approve an Item

```bash
squad-approval approve decision-1705328000000 --reason "Looks good"
```

**Expected output:**
```
✓ Approved: Use JWT for auth
  By: cli-user
  At: 2024-01-15T10:30:45.123Z
```

### Reject an Item

```bash
squad-approval reject decision-1705328000000 --reason "Need more context before deciding"
```

**Expected output:**
```
✗ Rejected: Use JWT for auth
  Reason: Need more context before deciding
  By: cli-user
```

### View Queue Status

```bash
squad-approval status
```

**Expected output:**
```
Approval Queue Status
──────────────────────────────
  Pending:  0
  Approved: 1
  Rejected: 0
  Expired:  0
  Total:    1
```

## Extending This Example

### Adding Custom Approval Sources

Implement the `ApprovalSource` interface to capture approvals from new sources:

```typescript
// src/adapters/SlackApprovalCapture.ts
export class SlackApprovalCapture {
  onMessageWithFlag(flag: string, handler: (msg) => void) {
    // Listen for Slack messages tagged with approval flag
    // Convert to ApprovalItem and add to queue
  }
}
```

### Integrating Notifications

Use the `NotificationDispatcher` to send alerts when approval states change:

```typescript
import { NotificationDispatcher } from './dist/index.js';

const dispatcher = new NotificationDispatcher(comms);
dispatcher.notify({
  channel: 'teams',
  message: 'New approval needed: PR #42',
  link: 'https://github.com/bradygaster/squad-sdk/pull/42'
});
```

### Programmatic API

Use the approval queue in your own integrations:

```typescript
import { ApprovalQueue, ApprovalItem } from '@bradygaster/project-squad-sdk-example-approval';

const queue = new ApprovalQueue();

// Create approval
const item = ApprovalItem.fromGitHubPR(
  42,
  'https://github.com/bradygaster/squad-sdk/pull/42',
  'feat: webhooks',
  'Adds webhook support'
);
queue.add(item);

// Query
queue.pending();         // All pending items
queue.approved();        // All approved items
queue.rejected();        // All rejected items
queue.expired();         // All expired items
queue.sortByPriority();  // Stale + escalations first

// Act
queue.approve(id, email);
queue.reject(id, email, reason);

// Read audit
const item = queue.get(id);
console.log(item.status, item.metadata);
```

### Architecture Overview

```
CLI Commands (approve, reject, list, status)
         ↓
ApprovalQueue (in-memory + file persistence)
         ↓
    ┌────┼────┐
    ↓    ↓    ↓
 Store  Item  Adapters (GitHub, ADO, Decisions)
    │    │    │
    └────┼────┘
         ↓
    Squad SDK (comms, GitHubAdapter, AzureDevOpsAdapter, DecisionsCollection)
```

## Project Structure

```
src/
├── models/
│   └── ApprovalItem.ts              # Core approval data structure
├── queue/
│   └── ApprovalQueue.ts             # In-memory queue with filters
├── storage/
│   └── ApprovalStore.ts             # Persistence to .squad/approvals/
├── adapters/
│   ├── GitHubApprovalCapture.ts     # Capture PRs
│   ├── DecisionApprovalCapture.ts   # Monitor decision files
│   └── ADOApprovalCapture.ts        # Monitor ADO escalations
├── cli/
│   ├── commands/
│   │   ├── inbox.ts                 # List pending approvals
│   │   ├── approve.ts               # Approve an item
│   │   └── reject.ts                # Reject with reason
│   └── index.ts                     # CLI entry point (bin)
├── monitoring/
│   └── ApprovalMonitor.ts           # Stale detection & escalation
├── notifications/
│   └── NotificationDispatcher.ts    # Send alerts via comms
├── analytics/
│   └── ApprovalAnalytics.ts         # Latency, approval rate metrics
└── index.ts
```

## SDK Modules

| Module | Capability | Usage |
|--------|-----------|-------|
| `platform.GitHubAdapter` | PR operations, labels | Capture PRs with `needs-approval` label |
| `platform.AzureDevOpsAdapter` | ADO work items | Monitor escalated items |
| `platform.comms` | GitHub Discussions, Teams | Notify on state changes |
| `state.DecisionsCollection` | Decision file I/O | Monitor `.squad/decisions/inbox/` |
| `runtime.EventBus` | Event emission | Emit approval-request events |
| `hooks.HookPipeline` | Gate actions | Triggers on approve/reject |
| `ralph.RalphMonitor` | Monitor tasks | Run stale detection on schedule |

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Run single test file
npm test -- test/models/ApprovalItem.test.ts

# Verbose output
npm test -- --reporter=verbose
```

Test files demonstrate the API and expected behavior:
- `test/models/ApprovalItem.test.ts` — Item creation & metadata
- `test/queue/ApprovalQueue.test.ts` — Queue operations & filtering
- `test/storage/ApprovalStore.test.ts` — Persistence
- `test/integration/end-to-end.test.ts` — Full workflow

## Roadmap

**Phase 1 (Complete)**: Core data model, queue, persistence  
**Phase 2 (In Progress)**: GitHub/Decision/ADO capture adapters  
**Phase 3 (Next)**: CLI inbox commands (list, approve, reject)  
**Phase 4**: Stale monitoring & Ralph integration  
**Phase 5**: Notification dispatcher  
**Phase 6**: Expiry & auto-escalation logic  
**Phase 7**: Analytics & metrics reporting

## License

MIT
