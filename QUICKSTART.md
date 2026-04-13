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
npm link   # makes the 'squad-approval' command available globally
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
squad-approval create --type decision --title "Use JWT for auth" --agent keaton --reason "Auth decision needed"
```

**Expected output:**
```
✓ Created approval: decision-1705328000000
  Type:  decision
  Title: Use JWT for auth
```

---

## Step 2: List Pending Approvals

```bash
squad-approval list
```

**Expected output:**
```
ID                        Type               Title                              Age
─────────────────────────────────────────────────────────────────────────────────
decision-1705328000000    decision           Use JWT for auth                   1s

Total: 1 pending approval
```

---

## Step 3: Approve an Item

```bash
squad-approval approve decision-1705328000000 --reason "Looks good"
```

**Expected output:**
```
✓ Approved: Use JWT for auth
  By: cli-user
  At: 2024-01-15T10:30:45.123Z
```

---

## Step 4: Reject an Item

```bash
squad-approval create --type decision --title "Exponential backoff strategy" --agent smith --reason "Backoff approach"
squad-approval reject decision-1705328100000 --reason "Linear backoff is simpler; reconsider after performance tests"
```

**Expected output:**
```
✗ Rejected: Exponential backoff strategy
  Reason: Linear backoff is simpler; reconsider after performance tests
  By: cli-user
```

---

## Step 5: Check Queue Status

```bash
squad-approval status
```

**Expected output:**
```
Approval Queue Status
──────────────────────────────
  Pending:  0
  Approved: 1
  Rejected: 1
  Expired:  0
  Total:    2
```

---

## CLI Reference

```bash
squad-approval --help
```

| Command   | Description                          | Example                                                                 |
|-----------|--------------------------------------|-------------------------------------------------------------------------|
| `create`  | Create a new approval request        | `squad-approval create --type decision --title "Use JWT" --agent keaton --reason "Auth"` |
| `list`    | List pending approvals               | `squad-approval list`                                                   |
| `approve` | Approve a pending item               | `squad-approval approve <id> --reason "Looks good"`                     |
| `reject`  | Reject a pending item (reason required) | `squad-approval reject <id> --reason "Need more context"`            |
| `status`  | Show queue summary                   | `squad-approval status`                                                 |

---

## Learn More

- **[README.md](./README.md)** — Architecture, extending, and SDK modules
- **[PLAN.md](./PLAN.md)** — Full design and roadmap
- **Test Files** — See `test/models/` and `test/queue/` for API examples
- **[Squad SDK](https://github.com/bradygaster/squad-sdk)** — Core documentation

---

**Ready to explore?** Check out the test files to see all supported operations, or dive into the README for integration patterns.
