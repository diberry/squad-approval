# Quick Start: Human Approval & Escalation Hub

Get up and running with the approval inbox in under 5 minutes.

## Prerequisites

- **Node.js** ≥ 18.x ([download](https://nodejs.org))
- **npm** ≥ 9.x (included with Node.js)
- **git** for cloning

## Step 1: Setup

```bash
# Clone the repository
git clone <repo-url>
cd project-squad-sdk-example-approval

# Install dependencies
npm install

# Build TypeScript
npm run build

# Verify tests pass
npm test
```

**Expected output:**
```
✓ test/models/ApprovalItem.test.ts (6 tests)
✓ test/queue/ApprovalQueue.test.ts (8 tests)
✓ test/storage/ApprovalStore.test.ts (3 tests)
...
✓ 30+ passing
```

## Step 2: Your First Approval Workflow

### Create a pending approval

Run the following Node.js script to create a PR approval request:

```bash
node -e "
import('./dist/index.js').then(({ ApprovalItem, ApprovalQueue }) => {
  const queue = new ApprovalQueue();
  
  // Create a GitHub PR approval request
  const pr = ApprovalItem.fromGitHubPR(
    42,
    'https://github.com/bradygaster/squad-sdk/pull/42',
    'feat: add webhook retry logic',
    'Improves resilience of event delivery'
  );
  pr.context.agentReasoning = 'Agent determined this affects critical path; needs human review';
  pr.context.affectedFiles = ['src/webhooks/retry.ts', 'test/webhooks/retry.test.ts'];
  
  const decision = ApprovalItem.fromDecisionFile(
    '.squad/decisions/inbox/use-exponential-backoff.md',
    'Architecture decision: exponential backoff strategy',
    'Proposed by: AgentSmith. Rationale: reduces API load on retries.'
  );
  
  const escalation = ApprovalItem.fromADOWorkItem(
    'devops-2024-001',
    'https://dev.azure.com/bradygaster/squad/-/workitems/12345',
    'Budget allocation: $5000 for new monitoring tools',
    'high'
  );
  
  queue.add(pr);
  queue.add(decision);
  queue.add(escalation);
  
  console.log('✓ Created 3 pending approvals');
}).catch(e => console.error(e));
"
```

### List pending approvals

```bash
node -e "
import('./dist/index.js').then(({ ApprovalItem, ApprovalQueue, InboxCommand }) => {
  const queue = new ApprovalQueue();
  
  // Add samples
  const pr = ApprovalItem.fromGitHubPR(42, 'https://github.com/.../42', 'feat: add webhook retry logic', 'Improves resilience');
  const decision = ApprovalItem.fromDecisionFile('.squad/decisions/inbox/use-backoff.md', 'Architecture: exponential backoff', 'Proposed by Agent');
  queue.add(pr);
  queue.add(decision);
  
  const cmd = new InboxCommand(queue);
  console.log(await cmd.list());
}).catch(e => console.error(e));
"
```

**Expected output:**
```
ID                        Type               Title                                      Age
-------------------------------------------------------------------------------------------
github-pr-42              github-pr          feat: add webhook retry logic               1s
decision-1705328000000    decision           Architecture: exponential backoff          1s

Total: 2 pending approvals
```

### Approve an item

```bash
node -e "
import('./dist/index.js').then(({ ApprovalItem, ApprovalQueue }) => {
  const queue = new ApprovalQueue();
  
  const pr = ApprovalItem.fromGitHubPR(42, 'https://github.com/.../42', 'feat: add webhook retry', 'Test');
  queue.add(pr);
  
  // Approve the PR
  const item = queue.approve('github-pr-42', 'alice@example.com');
  
  console.log('Approved:', item.title);
  console.log('Status:', item.status);
  console.log('Approved by:', item.metadata.approvedBy);
  console.log('Approved at:', item.metadata.approvedAt);
}).catch(e => console.error(e));
"
```

**Expected output:**
```
Approved: feat: add webhook retry
Status: approved
Approved by: alice@example.com
Approved at: 2024-01-15T10:30:45.123Z
```

### Reject an item with reason

```bash
node -e "
import('./dist/index.js').then(({ ApprovalItem, ApprovalQueue }) => {
  const queue = new ApprovalQueue();
  
  const decision = ApprovalItem.fromDecisionFile(
    '.squad/decisions/inbox/use-backoff.md',
    'Exponential backoff strategy',
    'Agent reasoning...'
  );
  queue.add(decision);
  
  // Reject with mandatory reason
  const item = queue.reject(
    'decision-1705328000000',
    'bob@example.com',
    'Linear backoff is simpler; reconsider after performance tests'
  );
  
  console.log('Rejected:', item.title);
  console.log('Reason:', item.metadata.rejectionReason);
  console.log('Rejected by:', item.metadata.rejectedBy);
}).catch(e => console.error(e));
"
```

**Expected output:**
```
Rejected: Exponential backoff strategy
Reason: Linear backoff is simpler; reconsider after performance tests
Rejected by: bob@example.com
```

### View approval audit trail

```bash
node -e "
import('./dist/index.js').then(({ ApprovalItem, ApprovalQueue }) => {
  const queue = new ApprovalQueue();
  
  const pr = ApprovalItem.fromGitHubPR(42, 'https://github.com/.../42', 'feat: add webhook retry', 'Test');
  queue.add(pr);
  queue.approve('github-pr-42', 'alice@example.com');
  
  const item = queue.get('github-pr-42');
  console.log('Item:', item.title);
  console.log('Type:', item.type);
  console.log('Status:', item.status);
  console.log('Created:', item.createdAt);
  console.log('Approved by:', item.metadata.approvedBy);
  console.log('Approved at:', item.metadata.approvedAt);
  console.log('');
  console.log('Context:');
  console.log('  - Reasoning:', item.context.agentReasoning);
  console.log('  - Files:', item.context.affectedFiles);
  console.log('  - Decisions:', item.context.relatedDecisions);
}).catch(e => console.error(e));
"
```

**Expected output:**
```
Item: feat: add webhook retry
Type: github-pr
Status: approved
Created: 2024-01-15T10:30:00.000Z
Approved by: alice@example.com
Approved at: 2024-01-15T10:30:45.123Z

Context:
  - Reasoning: undefined
  - Files: undefined
  - Decisions: undefined
```

## Step 3: Priority Sorting & Stale Detection

```bash
node -e "
import('./dist/index.js').then(({ ApprovalItem, ApprovalQueue }) => {
  const queue = new ApprovalQueue();
  
  // Create items with different ages
  const old = new ApprovalItem(
    'old-pr',
    'github-pr',
    'Old PR (2 hours pending)',
    'Should be stale'
  );
  old.createdAt = new Date(Date.now() - 2 * 3600000); // 2 hours ago
  
  const fresh = ApprovalItem.fromGitHubPR(99, 'https://github.com/.../99', 'Fresh PR (5 min old)', 'Just created');
  const escalation = ApprovalItem.fromADOWorkItem('ado-001', 'https://...', 'Budget request', 'high');
  
  queue.add(old);
  queue.add(fresh);
  queue.add(escalation);
  
  console.log('Sorted by priority (stale + escalations first):');
  const sorted = queue.sortByPriority();
  sorted.forEach((item, i) => {
    console.log(\`  \${i + 1}. \${item.type.padEnd(15)} \${item.title.slice(0, 30)}\`);
  });
}).catch(e => console.error(e));
"
```

**Expected output:**
```
Sorted by priority (stale + escalations first):
  1. ado-escalation   Budget request
  2. github-pr        Old PR (2 hours pending)
  3. github-pr        Fresh PR (5 min old)
```

## Next Steps

### 1. Integrate with GitHub PRs

Capture PRs automatically with the `needs-approval` label:

```typescript
import { GitHubApprovalCapture } from './dist/index.js';
import { GitHubAdapter } from '@bradygaster/squad-sdk';

const github = new GitHubAdapter();
const capture = new GitHubApprovalCapture(github);

// Listen for PRs with 'needs-approval' label
capture.onPRLabeled('needs-approval', (pr) => {
  console.log('PR flagged for approval:', pr.number);
});
```

### 2. Monitor Decision Files

Watch `.squad/decisions/inbox/` for new decisions:

```typescript
import { DecisionApprovalCapture } from './dist/index.js';
import { DecisionsCollection } from '@bradygaster/squad-sdk';

const decisions = new DecisionsCollection();
const capture = new DecisionApprovalCapture(decisions);

// Monitor for new decisions
capture.watchInbox((decision) => {
  console.log('New decision to approve:', decision.title);
});
```

### 3. Setup Stale Monitoring

Run periodic checks for stale approvals using Ralph:

```typescript
import { ApprovalMonitor } from './dist/index.js';
import { RalphMonitor } from '@bradygaster/squad-sdk';

const monitor = new ApprovalMonitor(queue);

// Register with Ralph for hourly stale checks
ralph.register('approval-monitor', {
  interval: '1h',
  task: () => monitor.checkStale(3600000)
});
```

### 4. Send Notifications

Notify humans via Teams or GitHub Discussions:

```typescript
import { NotificationDispatcher } from './dist/index.js';
import { comms } from '@bradygaster/squad-sdk';

const dispatcher = new NotificationDispatcher(comms);

// Send approval notification
dispatcher.notify({
  channel: 'teams',
  message: 'New approval needed: PR #42',
  link: 'https://github.com/bradygaster/squad-sdk/pull/42'
});
```

### 5. Generate Analytics

Track approval metrics:

```typescript
import { ApprovalAnalytics } from './dist/index.js';

const analytics = new ApprovalAnalytics(queue);

console.log('Median latency:', analytics.medianLatency()); // ms
console.log('Approval rate:', analytics.approvalRate());   // %
console.log('Top blockers:', analytics.topBlockers());     // oldest items
```

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│  CLI Commands (approve, reject, list, delegate) │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  ApprovalQueue (in-memory store with filters)   │
└──────────────┬──────────────────────────────────┘
               │
       ┌───────┼────────┐
       │       │        │
    ┌──▼──┐ ┌──▼──┐ ┌───▼────┐
    │Store│ │Item │ │Adapters│
    └─────┘ └─────┘ └────────┘
       │       │        │
       └───────┼────────┘
               │
        ┌──────▼──────┐
        │  Squad SDK  │
        │ (comms,     │
        │  github,    │
        │  ado, etc)  │
        └─────────────┘
```

## Troubleshooting

### Build fails with TypeScript errors
```bash
npm run build
# Look for type mismatches in error output
# Check that @bradygaster/squad-sdk is installed
npm install
```

### Tests fail
```bash
npm test
# Run with verbose output
npm test -- --reporter=verbose

# Run single test file
npm test -- test/models/ApprovalItem.test.ts
```

### Approval item not found
Ensure the item ID matches exactly (case-sensitive):
```typescript
queue.get('github-pr-42'); // ✓ correct
queue.get('GitHub-PR-42'); // ✗ not found
```

## Resources

- **[README.md](./README.md)** — Project overview and architecture
- **[PLAN.md](./PLAN.md)** — Full TDD specification and roadmap
- **[Squad SDK](https://github.com/bradygaster/squad-sdk)** — Core SDK documentation

## Support

For issues or questions:
1. Check [PLAN.md](./PLAN.md) for design rationale
2. Review test files in `test/` for usage examples
3. Open an issue on the repository

---

**Ready to build?** Start by reading the test files in `test/models/` and `test/queue/` to understand the API.
