# Squad SDK Example: Human Approval & Escalation Hub

A unified approval inbox built on [Squad SDK](https://github.com/bradygaster/squad-sdk) that collects agent proposals requiring human sign-off (PR approvals, architecture decisions, budget overruns, policy waivers) into a single interface with threaded context and audit trails.

## Using This Example

### Install & Build

```bash
git clone <repo-url>
cd project-squad-sdk-example-approval
npm install
npm run build
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
# Create a GitHub PR approval request (programmatic)
npm run build
node -e "
import('./dist/index.js').then(m => {
  const pr = m.ApprovalItem.fromGitHubPR(
    42,
    'https://github.com/bradygaster/squad-sdk/pull/42',
    'feat: add webhook retry logic',
    'Improves resilience of event delivery'
  );
  pr.context.agentReasoning = 'Agent determined this affects critical path';
  const q = new m.ApprovalQueue();
  q.add(pr);
  console.log('✓ Submitted approval request:', pr.id);
}).catch(e => console.error(e));
"
```

Or create from decision files or ADO work items:

```bash
# Decision file
const decision = ApprovalItem.fromDecisionFile(
  '.squad/decisions/inbox/use-exponential-backoff.md',
  'Architecture decision: exponential backoff strategy',
  'Proposed by AgentSmith'
);

# ADO work item
const escalation = ApprovalItem.fromADOWorkItem(
  'devops-2024-001',
  'https://dev.azure.com/bradygaster/squad/-/workitems/12345',
  'Budget allocation: $5000 for monitoring tools',
  'high'
);
```

### List Pending Approvals

```bash
npm run build
node -e "
import('./dist/index.js').then(m => {
  const q = new m.ApprovalQueue();
  const cmd = new m.InboxCommand(q);
  console.log(cmd.list());
}).catch(e => console.error(e));
"
```

**Expected output:**
```
ID                        Type               Title                              Age
─────────────────────────────────────────────────────────────────────────────────
github-pr-42              github-pr          feat: add webhook retry logic      1m
decision-1705328000000    decision           Architecture: exponential backoff  5m

Total: 2 pending approvals
```

### Approve an Item

```bash
npm run build
node -e "
import('./dist/index.js').then(m => {
  const q = new m.ApprovalQueue();
  const item = q.approve('github-pr-42', 'alice@example.com');
  console.log('✓ Approved:', item.title);
  console.log('By:', item.metadata.approvedBy);
  console.log('At:', item.metadata.approvedAt);
}).catch(e => console.error(e));
"
```

**Expected output:**
```
✓ Approved: feat: add webhook retry logic
By: alice@example.com
At: 2024-01-15T10:30:45.123Z
```

### Reject an Item

```bash
npm run build
node -e "
import('./dist/index.js').then(m => {
  const q = new m.ApprovalQueue();
  const item = q.reject(
    'decision-1705328000000',
    'bob@example.com',
    'Linear backoff is simpler; reconsider after performance tests'
  );
  console.log('✗ Rejected:', item.title);
  console.log('Reason:', item.metadata.rejectionReason);
  console.log('By:', item.metadata.rejectedBy);
}).catch(e => console.error(e));
"
```

**Expected output:**
```
✗ Rejected: Architecture: exponential backoff
Reason: Linear backoff is simpler; reconsider after performance tests
By: bob@example.com
```

### View Approval Audit Trail

```bash
npm run build
node -e "
import('./dist/index.js').then(m => {
  const q = new m.ApprovalQueue();
  const item = q.get('github-pr-42');
  console.log('Item:', item.title);
  console.log('Type:', item.type);
  console.log('Status:', item.status);
  console.log('Created:', item.createdAt);
  console.log('Approved by:', item.metadata.approvedBy);
  console.log('Approved at:', item.metadata.approvedAt);
  console.log('Context - Reasoning:', item.context.agentReasoning);
  console.log('Context - Files:', item.context.affectedFiles);
}).catch(e => console.error(e));
"
```

**Expected output:**
```
Item: feat: add webhook retry logic
Type: github-pr
Status: approved
Created: 2024-01-15T10:30:00.000Z
Approved by: alice@example.com
Approved at: 2024-01-15T10:30:45.123Z
Context - Reasoning: Agent determined this affects critical path
Context - Files: src/webhooks/retry.ts, test/webhooks/retry.test.ts
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
queue.delegate(id, targetEmail);

// Read audit
const item = queue.get(id);
console.log(item.status, item.metadata);
```

### Architecture Overview

```
CLI Commands (approve, reject, list, delegate)
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
│   │   ├── reject.ts                # Reject with reason
│   │   └── delegate.ts              # Delegate to person
│   └── index.ts
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
