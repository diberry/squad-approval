# Squad SDK Example: Human Approval & Escalation Hub

A unified approval inbox built on [Squad SDK](https://github.com/bradygaster/squad-sdk) that collects agent proposals requiring human sign-off (PR approvals, architecture decisions, budget overruns, policy waivers) into a single interface with threaded context.

## Features

- **Unified Approval Queue**: Collect PRs, decisions, ADO escalations, and policy waivers in one inbox
- **Priority Sorting**: Stale items float to top; escalations ranked above routine PRs
- **CLI Inbox**: Human-readable table view of pending approvals with age formatting
- **Approve/Reject/Delegate**: Act on items with audit trail and metadata
- **Stale Detection**: Automatic escalation for items pending > 1 hour
- **Event Integration**: Capture GitHub PRs, decision files, and ADO work items
- **Persistent Storage**: Save/load queue state to `.squad/approvals/`
- **Context Threading**: Link agent reasoning, affected files, and related decisions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI Inbox Commands                       │
│     inbox list | approve <id> | reject <id> | delegate     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│              ApprovalQueue (In-Memory Store)                │
│  pending() / approved() / rejected() / expired()            │
│  sortByPriority() / expireStale()                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
┌──────▼──────┐ ┌──────▼──────┐ ┌─────▼──────────┐
│ ApprovalItem│ │ApprovalStore│ │  Adapters      │
│  (model)    │ │ (persistence)│ │ GitHub/ADO/Dcn │
└─────────────┘ └─────────────┘ └────────────────┘
       │                │               │
       └────────────────┴───────────────┘
                │
        ┌───────▼────────┐
        │    Squad SDK   │
        │ (GitHubAdapter,│
        │  ADOAdapter,   │
        │  comms, etc.)  │
        └────────────────┘
```

## SDK Modules Used

| Module | Capability | Usage |
|--------|-----------|-------|
| `platform.GitHubAdapter` | PR operations, comments, labels | Capture PRs with `needs-approval` label |
| `platform.AzureDevOpsAdapter` | ADO work item ops | Monitor escalated work items |
| `platform.comms` | GitHub Discussions, Teams, file log | Send notifications on approval changes |
| `state.DecisionsCollection` | Decision file I/O | Monitor `.squad/decisions/inbox/` |
| `runtime.EventBus` | Event emission | Emit approval-request events |
| `hooks.HookPipeline` | Gate actions | Approve/reject triggers hooks |
| `ralph.RalphMonitor` | Monitor tasks | Run stale detection on schedule |

## Project Structure

```
.
├── src/
│   ├── models/
│   │   └── ApprovalItem.ts          # Core approval data structure
│   ├── queue/
│   │   └── ApprovalQueue.ts         # In-memory queue with filters
│   ├── storage/
│   │   └── ApprovalStore.ts         # Persistence to .squad/approvals/
│   ├── adapters/
│   │   ├── GitHubApprovalCapture.ts # Capture PRs
│   │   ├── DecisionApprovalCapture.ts # Monitor decision files
│   │   └── ADOApprovalCapture.ts    # Monitor ADO escalations
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── inbox.ts            # List pending approvals
│   │   │   ├── approve.ts          # Approve an item
│   │   │   ├── reject.ts           # Reject with reason
│   │   │   └── delegate.ts         # Delegate to person
│   │   └── index.ts
│   ├── monitoring/
│   │   └── ApprovalMonitor.ts       # Stale detection & escalation
│   ├── notifications/
│   │   └── NotificationDispatcher.ts # Send alerts via comms
│   ├── analytics/
│   │   └── ApprovalAnalytics.ts     # Latency, approval rate metrics
│   └── index.ts
├── test/
│   ├── models/
│   │   └── ApprovalItem.test.ts
│   ├── queue/
│   │   └── ApprovalQueue.test.ts
│   ├── storage/
│   │   └── ApprovalStore.test.ts
│   ├── adapters/
│   ├── cli/
│   ├── monitoring/
│   ├── analytics/
│   └── integration/
│       └── end-to-end.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
└── QUICKSTART.md
```

## Installation

### Prerequisites

- Node.js ≥ 18.x
- npm ≥ 9.x

### Steps

```bash
# Clone the repository
git clone <repo-url>
cd project-squad-sdk-example-approval

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## Configuration

Approvals are stored in `.squad/approvals/` directory:

```
.squad/
├── approvals/
│   ├── pending.json      # Current pending items
│   └── history/
│       ├── 2024-01-15.json  # Approved/rejected items
│       └── ...
```

Default approval timeout is **24 hours**. Items are automatically marked `expired` after this period.

Stale detection threshold (default **1 hour**) can be configured:

```typescript
const monitor = new ApprovalMonitor(queue);
monitor.checkStale(3600000); // 1 hour in ms
```

## Quick Start

See **[QUICKSTART.md](./QUICKSTART.md)** for a step-by-step walkthrough of creating, listing, and resolving approvals.

## Development

```bash
# Build TypeScript
npm run build

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- test/models/ApprovalItem.test.ts
```

## Examples

### List pending approvals
```bash
npm run build
node -e "
  import('./dist/index.js').then(({ ApprovalQueue, InboxCommand }) => {
    const q = new ApprovalQueue();
    const cmd = new InboxCommand(q);
    console.log(await cmd.list());
  });
"
```

### Approve an item
```typescript
import { ApprovalQueue } from '@bradygaster/project-squad-sdk-example-approval';

const queue = new ApprovalQueue();
const item = queue.approve('github-pr-42', 'alice@example.com');
console.log(`Approved: ${item.title}`);
```

## Architecture Decisions

- **In-memory queue** for fast access; backed by file storage for durability
- **TDD approach** — all features start with test cases before implementation
- **Event-driven** — approval status changes emit events on Squad SDK EventBus
- **CLI-first MVP** — command-line interface; web dashboard planned for future phase
- **Modular adapters** — easy to add new approval sources (Slack, Jira, etc.)

## Roadmap

**Phase 1 (Complete)**: Core data model, queue, persistence  
**Phase 2 (In Progress)**: GitHub/Decision/ADO capture adapters  
**Phase 3 (Next)**: CLI inbox commands (list, approve, reject)  
**Phase 4**: Stale monitoring & Ralph integration  
**Phase 5**: Notification dispatcher  
**Phase 6**: Expiry & auto-escalation logic  
**Phase 7**: Analytics & metrics reporting  
**Roadmap**: Web dashboard (not yet implemented — see `src/web/server.ts` stub)

## License

MIT
