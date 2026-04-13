# TDD Implementation Plan: Human Approval & Escalation Hub

## Project Overview

A unified approval inbox built on Squad SDK that collects agent proposals requiring human sign-off (PR approvals, architecture decisions, budget overruns, policy waivers) into a single interface with threaded context.

## Verified SDK Modules

| Module | Capability | Status |
|--------|-----------|--------|
| `platform.GitHubAdapter` | Issue/PR operations, comments, labels | ✅ Solid |
| `platform.AzureDevOpsAdapter` | ADO work item operations | ✅ Solid |
| `platform.comms` | GitHub Discussions, ADO Discussions, Teams (webhook), file log | ✅ Solid |
| `state.DecisionsCollection` | Read/write decision files | ✅ Solid |
| `runtime.EventBus` | Emit approval-request events | ✅ Solid |
| `hooks.HookPipeline` | Gate actions on approval status | ✅ Solid |
| `ralph.RalphMonitor` | Track stale/pending approvals | ✅ Solid |

## Known Gaps (Must Build)

- Approval queue data structure (pending, approved, rejected, expired)
- Unified inbox UI (terminal CLI or web)
- Notification delivery orchestration beyond SDK adapters
- Approval timeout/expiry logic
- Context threading (agent reasoning + affected files + decisions)

---

## Phase 1: Core Data Model (Foundation)

**Dependencies:** None  
**Estimated:** 3-4 days

### Feature 1.1: ApprovalItem Data Model

**Tests:**
- `test('ApprovalItem stores id, type, status, created_at, expires_at')`
  - Assert: can create ApprovalItem with required fields
  - Assert: status is one of pending/approved/rejected/expired
- `test('ApprovalItem.from_github_pr creates item with PR context')`
  - Assert: extracts PR number, title, URL from GitHub event
- `test('ApprovalItem.from_decision_file creates item with decision context')`
  - Assert: reads decision file, extracts agent reasoning, status
- `test('ApprovalItem.context() returns agent reasoning, affected files, related decisions')`
  - Assert: all three context fields populated

**Implementation:**
- Create `src/models/ApprovalItem.ts` with interfaces for PR, ADO, decision-based items
- Add factory methods to construct from platform events
- Add context aggregation method to pull linked decisions and files

---

### Feature 1.2: ApprovalQueue (In-Memory Store)

**Tests:**
- `test('ApprovalQueue.add() inserts item and returns queue size')`
  - Assert: item.id is unique, error on duplicate
- `test('ApprovalQueue.pending() returns only items with status=pending')`
  - Assert: filters by status, sorted by created_at
- `test('ApprovalQueue.approve(id) updates status and records approver')`
  - Assert: status changes to approved, approver stored, timestamp recorded
- `test('ApprovalQueue.reject(id, reason) stores rejection reason')`
  - Assert: status → rejected, reason persisted
- `test('ApprovalQueue.expire(id) marks stale items')`
  - Assert: status → expired if elapsed > timeout

**Implementation:**
- Create `src/queue/ApprovalQueue.ts` with Map-based storage
- Implement pending/approved/rejected/expired filters
- Add expiry check logic (compare created_at + timeout vs now)

---

### Feature 1.3: Persistence Layer (File-based)

**Tests:**
- `test('ApprovalStore.save() writes queue to .squad/approvals/pending.json')`
  - Assert: file created with JSON array of items
- `test('ApprovalStore.load() reads from disk and restores queue')`
  - Assert: queue.pending().length matches saved item count
- `test('ApprovalStore.archive(id) moves approved/rejected items to history/')`
  - Assert: item removed from pending.json, added to history with timestamp

**Implementation:**
- Create `src/storage/ApprovalStore.ts`
- Leverage SDK's `StorageProvider` or file I/O for `.squad/approvals/`
- Implement archival logic to move resolved items

---

## Phase 2: Integration with SDK Adapters (Event Capture)

**Dependencies:** Phase 1  
**Estimated:** 3-4 days

### Feature 2.1: GitHub PR Approval Requests

**Tests:**
- `test('GitHubApprovalCapture.on_pr_opened() creates ApprovalItem')`
  - Assert: item type = 'github-pr', captures PR #, title, URL
  - Assert: context includes diff summary
- `test('GitHubApprovalCapture.on_pr_labeled_needs_approval() flags PR')`
  - Assert: PR labeled with `needs-approval` triggers new queue entry

**Implementation:**
- Create `src/adapters/GitHubApprovalCapture.ts`
- Hook into GitHub event stream (webhook or polling)
- Create ApprovalItem for PRs with `needs-approval` label
- Store PR metadata (diff link, review status)

---

### Feature 2.2: Decision File Monitoring

**Tests:**
- `test('DecisionApprovalCapture.on_decision_inbox() creates item')`
  - Assert: watches `.squad/decisions/inbox/` for new files
  - Assert: extracts decision title, proposed_by, agent_reasoning
- `test('DecisionApprovalCapture.on_decision_moved() removes from queue')`
  - Assert: when file moved to `decisions/approved/`, item status → approved

**Implementation:**
- Create `src/adapters/DecisionApprovalCapture.ts`
- Use SDK's `DecisionsCollection` to watch inbox
- Parse decision YAML/JSON to extract context
- Link to approval queue on inbox file creation

---

### Feature 2.3: ADO Work Item Escalations

**Tests:**
- `test('ADOApprovalCapture.on_workitem_escalated() creates item')`
  - Assert: item type = 'ado-escalation', captures work item ID, title
  - Assert: context includes assigned user, state, priority
- `test('ADOApprovalCapture.on_approval_gate_triggered() queues item')`
  - Assert: hook pipeline can emit approval events

**Implementation:**
- Create `src/adapters/ADOApprovalCapture.ts`
- Hook into ADO work item state changes
- Integrate with SDK's `HookPipeline` for approval gates
- Store ADO context (work item link, priority)

---

## Phase 3: CLI Inbox Interface (P0 MVP)

**Dependencies:** Phase 1, Phase 2  
**Estimated:** 2-3 days

### Feature 3.1: `squad inbox` Command (List)

**Tests:**
- `test('inbox command lists pending approvals')`
  - Assert: calls queue.pending(), prints table with id, type, title, age
  - Assert: sorted by created_at ascending
- `test('inbox command formats output readable')`
  - Assert: truncates long titles, shows age in human format (2h 15m)
  - Assert: color-codes by type (PR=blue, decision=yellow, escalation=red)

**Implementation:**
- Create `src/cli/commands/inbox.ts`
- Query ApprovalQueue.pending()
- Format as table with columns: id, type, title, age, status
- Use SDK's CLI output utilities for color/formatting

---

### Feature 3.2: `squad inbox approve <id>` Command

**Tests:**
- `test('inbox approve command updates item status')`
  - Assert: queue.approve(id) called with human's username
  - Assert: timestamp recorded, item marked approved
- `test('inbox approve command persists change')`
  - Assert: ApprovalStore.save() called
- `test('inbox approve with --reason flag stores decision note')`
  - Assert: approval metadata includes optional reason field

**Implementation:**
- Create `src/cli/commands/approve.ts`
- Parse id from args, resolve human identity from git/env
- Call queue.approve(id), store metadata
- Emit approval event on SDK EventBus

---

### Feature 3.3: `squad inbox reject <id>` Command

**Tests:**
- `test('inbox reject command requires --reason flag')`
  - Assert: error thrown if --reason not provided
- `test('inbox reject updates item status and stores reason')`
  - Assert: queue.reject(id, reason) called
  - Assert: rejection metadata persisted
- `test('inbox reject emits rejection event')`
  - Assert: SDK EventBus emits 'approval.rejected' with reason

**Implementation:**
- Create `src/cli/commands/reject.ts`
- Require --reason flag (mandatory for audit)
- Call queue.reject(id, reason)
- Emit rejection event for agents to handle

---

## Phase 4: Stale Approval Monitoring (Ralph Integration)

**Dependencies:** Phase 1, Phase 2  
**Estimated:** 2 days

### Feature 4.1: Stale Item Detection & Escalation

**Tests:**
- `test('ApprovalMonitor.check_stale() identifies items > 1 hour old')`
  - Assert: filters queue.pending() by age, marks as stale
  - Assert: returns list of stale items with reason
- `test('ApprovalMonitor.escalate_stale() sends notification')`
  - Assert: uses comms adapter to send Teams/GH Discussion message
  - Assert: includes item summary and approval link
- `test('ApprovalMonitor integrates with Ralph schedule')`
  - Assert: can be registered as Ralph monitor task
  - Assert: runs on configured interval (default 1h)

**Implementation:**
- Create `src/monitoring/ApprovalMonitor.ts`
- Extend Ralph's MonitorTask interface
- Check items with age > configurable threshold (default 1h)
- Send escalation via SDK comms adapters

---

## Phase 5: Unified Inbox UX & Notifications (P1)

**Dependencies:** Phase 1-4  
**Estimated:** 3-4 days

### Feature 5.1: Priority Sorting

**Tests:**
- `test('ApprovalQueue.sorted_by_priority() returns P0 items first')`
  - Assert: stale items ranked higher than fresh
  - Assert: escalations (budget/policy) ranked above routine PRs
- `test('Priority sorting is stable')`
  - Assert: same-priority items maintain creation order

**Implementation:**
- Extend `ApprovalQueue` with priority metadata
- Add comparator function for custom sort
- Rank by: stale > escalation > decision > PR

---

### Feature 5.2: Bulk Approve/Reject

**Tests:**
- `test('inbox approve-all --filter=stale approves matching items')`
  - Assert: accepts filter query (stale, escalation, type=decision)
  - Assert: applies action to all matching items
  - Assert: logs audit trail of bulk action
- `test('inbox reject-all requires confirmation')`
  - Assert: prompts user to confirm before bulk rejection

**Implementation:**
- Extend CLI commands with --filter flag
- Add confirmation prompt for destructive bulk actions
- Log audit trail with timestamp, human, count, filter

---

### Feature 5.3: Notification Integration

**Tests:**
- `test('NotificationDispatcher.send_to_comms() uses GitHub/ADO/Teams')`
  - Assert: can target specific adapter (slack, teams, gh-discussions)
  - Assert: sends item summary with approval link
- `test('NotificationDispatcher respects quiet hours')`
  - Assert: no notifications between 7PM-8AM (configurable)

**Implementation:**
- Create `src/notifications/NotificationDispatcher.ts`
- Leverage SDK's `platform.comms` adapters
- Add quiet hours config
- Template messages per channel

---

## Phase 6: Expiry & Auto-Escalation (P1)

**Dependencies:** Phase 1-5  
**Estimated:** 2-3 days

### Feature 6.1: Approval Timeout & Auto-Rejection

**Tests:**
- `test('ApprovalQueue.auto_expire() marks items > 24h as expired')`
  - Assert: configurable timeout (default 24h)
  - Assert: status → expired, reason = "timeout"
- `test('AutoExpireTask runs on Ralph schedule')`
  - Assert: can be registered as monitor task
  - Assert: runs daily or on configured interval
- `test('Expired items trigger agent callback')`
  - Assert: EventBus emits 'approval.expired' event

**Implementation:**
- Add expiry logic to `ApprovalMonitor`
- Store timeout config (per item type)
- Emit event for agents to retry or escalate

---

### Feature 6.2: Delegation (Route to Person)

**Tests:**
- `test('inbox delegate <id> --to=@person updates assignee')`
  - Assert: stores delegated_to field
  - Assert: sends notification to assignee
- `test('Delegated items appear in delegatee's inbox')`
  - Assert: query can filter by delegated_to == current_user

**Implementation:**
- Extend CLI with delegate command
- Store delegated_to in ApprovalItem metadata
- Query filters to show items assigned to self

---

## Phase 7: Analytics & Dashboard (P2)

**Dependencies:** Phase 1-6  
**Estimated:** 3-4 days

### Feature 7.1: Approval Metrics

**Tests:**
- `test('ApprovalAnalytics.median_latency() calculates avg response time')`
  - Assert: (approved_at - created_at) for all approved items
  - Assert: returns milliseconds, convertible to human format
- `test('ApprovalAnalytics.approval_rate() calculates % approved vs rejected')`
  - Assert: (approved_count / total_count)
- `test('ApprovalAnalytics.top_blockers() identifies slow items')`
  - Assert: returns items pending > 2 hours, sorted by age

**Implementation:**
- Create `src/analytics/ApprovalAnalytics.ts`
- Query approved/rejected items from archive
- Calculate latency, rates, trending

---

### Feature 7.2: Web Dashboard (MVP)

**Tests:**
- `test('Dashboard endpoint /api/approvals returns pending items')`
  - Assert: returns JSON array with full context
- `test('Dashboard renders approval list with filtering')`
  - Assert: HTML table with columns: id, type, title, age, priority
  - Assert: filter dropdown for type/priority

**Implementation:**
- Create `src/web/server.ts` (Express or Hono)
- Add `/api/approvals` endpoint
- Create `src/web/index.html` with vanilla JS frontend
- Polling or WebSocket for live updates

---

## Implementation Order (Sequential Phases)

```
1. Core Data Model (ApprovalItem, ApprovalQueue, Persistence)
   ↓
2. SDK Integration (GitHub PR, Decision, ADO capture)
   ↓
3. CLI Inbox (list, approve, reject commands)
   ↓
4. Stale Monitoring & Ralph Integration
   ↓
5. Notifications & Priority Sorting
   ↓
6. Expiry & Delegation Logic
   ↓
7. Analytics & Web Dashboard
```

## Test Strategy

- **Unit tests** for data models and queue logic (no I/O)
- **Integration tests** for adapter capture (mock SDK events)
- **CLI tests** for command parsing and output (fixtures)
- **E2E tests** for full flow: propose → queue → approve → archive

## Success Criteria

| Metric | P0 Target | P1+ Target |
|--------|-----------|-----------|
| Median approval latency | < 30 min | < 15 min |
| Stale approval rate | < 20% | < 10% |
| Approval precision | > 85% | > 90% |
| Notification-to-action rate | N/A | > 70% |

---

## File Structure

```
src/
├── models/
│   └── ApprovalItem.ts
├── queue/
│   └── ApprovalQueue.ts
├── storage/
│   └── ApprovalStore.ts
├── adapters/
│   ├── GitHubApprovalCapture.ts
│   ├── DecisionApprovalCapture.ts
│   └── ADOApprovalCapture.ts
├── cli/
│   ├── commands/
│   │   ├── inbox.ts
│   │   ├── approve.ts
│   │   ├── reject.ts
│   │   └── delegate.ts
│   └── index.ts
├── monitoring/
│   └── ApprovalMonitor.ts
├── notifications/
│   └── NotificationDispatcher.ts
├── analytics/
│   └── ApprovalAnalytics.ts
├── web/
│   ├── server.ts
│   └── index.html
└── index.ts

test/
├── models/
│   └── ApprovalItem.test.ts
├── queue/
│   └── ApprovalQueue.test.ts
├── storage/
│   └── ApprovalStore.test.ts
├── adapters/
│   ├── GitHubApprovalCapture.test.ts
│   ├── DecisionApprovalCapture.test.ts
│   └── ADOApprovalCapture.test.ts
├── cli/
│   ├── inbox.test.ts
│   ├── approve.test.ts
│   └── reject.test.ts
├── monitoring/
│   └── ApprovalMonitor.test.ts
├── notifications/
│   └── NotificationDispatcher.test.ts
├── analytics/
│   └── ApprovalAnalytics.test.ts
└── integration/
    └── end-to-end.test.ts
```

---

## Next Steps

1. Complete Phase 1 (core data model) with TDD — write test files first
2. Set up vitest config and validate test infrastructure
3. Implement Phase 2 (SDK adapters) once Phase 1 is passing
4. Demo MVP (Phase 1-3) after 2 weeks
5. Gather feedback on CLI UX before moving to Phase 5+
