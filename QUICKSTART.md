# Quick Start: Human Approval & Escalation Hub

Get up and running with the approval inbox in under 5 minutes.

## Prerequisites

- **Node.js** ≥ 18.x ([download](https://nodejs.org))
- **npm** ≥ 9.x (included with Node.js)
- **git** for cloning

## Setup

```bash
git clone <repo-url>
cd project-squad-sdk-example-approval
npm install
npm run build
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

---

## Step 1: Create an Approval Request

```bash
npm run build
node -e "
import('./dist/index.js').then(m => {
  const queue = new m.ApprovalQueue();
  
  const pr = m.ApprovalItem.fromGitHubPR(
    42,
    'https://github.com/bradygaster/squad-sdk/pull/42',
    'feat: add webhook retry logic',
    'Improves resilience of event delivery'
  );
  pr.context.agentReasoning = 'Agent determined this affects critical path; needs human review';
  pr.context.affectedFiles = ['src/webhooks/retry.ts', 'test/webhooks/retry.test.ts'];
  
  queue.add(pr);
  console.log('✓ Created approval:', pr.id);
}).catch(e => console.error(e));
"
```

**Expected output:**
```
✓ Created approval: github-pr-42
```

---

## Step 2: List Pending Approvals

```bash
npm run build
node -e "
import('./dist/index.js').then(m => {
  const queue = new m.ApprovalQueue();
  
  const pr = m.ApprovalItem.fromGitHubPR(
    42,
    'https://github.com/bradygaster/squad-sdk/pull/42',
    'feat: add webhook retry logic',
    'Improves resilience'
  );
  queue.add(pr);
  
  const cmd = new m.InboxCommand(queue);
  console.log(cmd.list());
}).catch(e => console.error(e));
"
```

**Expected output:**
```
ID                   Type           Title                              Age
─────────────────────────────────────────────────────────────────────────────
github-pr-42         github-pr      feat: add webhook retry logic      1s

Total: 1 pending approval
```

---

## Step 3: Approve an Item

```bash
npm run build
node -e "
import('./dist/index.js').then(m => {
  const queue = new m.ApprovalQueue();
  
  const pr = m.ApprovalItem.fromGitHubPR(
    42,
    'https://github.com/bradygaster/squad-sdk/pull/42',
    'feat: add webhook retry',
    'Test'
  );
  queue.add(pr);
  
  const item = queue.approve('github-pr-42', 'alice@example.com');
  
  console.log('Status:', item.status);
  console.log('Approved by:', item.metadata.approvedBy);
  console.log('Approved at:', item.metadata.approvedAt);
}).catch(e => console.error(e));
"
```

**Expected output:**
```
Status: approved
Approved by: alice@example.com
Approved at: 2024-01-15T10:30:45.123Z
```

---

## Step 4: Reject an Item

```bash
npm run build
node -e "
import('./dist/index.js').then(m => {
  const queue = new m.ApprovalQueue();
  
  const decision = m.ApprovalItem.fromDecisionFile(
    '.squad/decisions/inbox/use-backoff.md',
    'Exponential backoff strategy',
    'Agent reasoning...'
  );
  queue.add(decision);
  
  const item = queue.reject(
    'decision-' + decision.id,
    'bob@example.com',
    'Linear backoff is simpler; reconsider after performance tests'
  );
  
  console.log('Status:', item.status);
  console.log('Reason:', item.metadata.rejectionReason);
  console.log('Rejected by:', item.metadata.rejectedBy);
}).catch(e => console.error(e));
"
```

**Expected output:**
```
Status: rejected
Reason: Linear backoff is simpler; reconsider after performance tests
Rejected by: bob@example.com
```

---

## Step 5: Check Approval Audit Trail

```bash
npm run build
node -e "
import('./dist/index.js').then(m => {
  const queue = new m.ApprovalQueue();
  
  const pr = m.ApprovalItem.fromGitHubPR(
    42,
    'https://github.com/bradygaster/squad-sdk/pull/42',
    'feat: add webhook retry',
    'Test'
  );
  queue.add(pr);
  queue.approve('github-pr-42', 'alice@example.com');
  
  const item = queue.get('github-pr-42');
  
  console.log('─ Approval Audit Trail');
  console.log('Title:', item.title);
  console.log('Type:', item.type);
  console.log('Status:', item.status);
  console.log('Created:', item.createdAt);
  console.log('');
  console.log('Approval Details:');
  console.log('  Approved by:', item.metadata.approvedBy);
  console.log('  Approved at:', item.metadata.approvedAt);
  console.log('');
  console.log('Context:');
  console.log('  Reasoning:', item.context.agentReasoning || '(not set)');
  console.log('  Files:', item.context.affectedFiles || '(none)');
}).catch(e => console.error(e));
"
```

**Expected output:**
```
─ Approval Audit Trail
Title: feat: add webhook retry
Type: github-pr
Status: approved
Created: 2024-01-15T10:30:00.000Z

Approval Details:
  Approved by: alice@example.com
  Approved at: 2024-01-15T10:30:45.123Z

Context:
  Reasoning: (not set)
  Files: (none)
```

---

## Next Steps: Priority & Stale Detection

```bash
npm run build
node -e "
import('./dist/index.js').then(m => {
  const queue = new m.ApprovalQueue();
  
  const old = new m.ApprovalItem(
    'old-pr',
    'github-pr',
    'Old PR (2 hours pending)',
    'Should be stale'
  );
  old.createdAt = new Date(Date.now() - 2 * 3600000);
  
  const fresh = m.ApprovalItem.fromGitHubPR(
    99,
    'https://github.com/.../99',
    'Fresh PR (5 min old)',
    'Just created'
  );
  const escalation = m.ApprovalItem.fromADOWorkItem(
    'ado-001',
    'https://...',
    'Budget request',
    'high'
  );
  
  queue.add(old);
  queue.add(fresh);
  queue.add(escalation);
  
  console.log('Sorted by priority (stale + escalations first):');
  queue.sortByPriority().forEach((item, i) => {
    console.log(\`  \${i + 1}. [\${item.type}] \${item.title.slice(0, 40)}\`);
  });
}).catch(e => console.error(e));
"
```

**Expected output:**
```
Sorted by priority (stale + escalations first):
  1. [ado-escalation] Budget request
  2. [github-pr] Old PR (2 hours pending)
  3. [github-pr] Fresh PR (5 min old)
```

---

## Learn More

- **[README.md](./README.md)** — Architecture, extending, and SDK modules
- **[PLAN.md](./PLAN.md)** — Full design and roadmap
- **Test Files** — See `test/models/` and `test/queue/` for API examples
- **[Squad SDK](https://github.com/bradygaster/squad-sdk)** — Core documentation

---

**Ready to explore?** Check out the test files to see all supported operations, or dive into the README for integration patterns.
