# Squad SDK Example: Human Approval & Escalation Hub

A unified approval inbox built on Squad SDK that collects agent proposals requiring human sign-off into a single interface with threaded context.

## Overview

This project demonstrates how to build a human-in-the-loop approval system using the Squad SDK. Agents propose decisions, create PRs, and flag issues for review—this hub provides a unified CLI and eventual web interface to manage approvals.

## Features

### P0 — MVP
- **Approval queue**: Centralized list of items waiting for human action (decisions, PRs, escalations)
- **Context threading**: Each approval item shows agent reasoning, affected files, and decisions
- **CLI inbox**: `squad inbox` — list pending approvals with summaries
- **Approve/reject**: `squad inbox approve <id>` / `squad inbox reject <id> --reason "..."`
- **Stale reminders**: Ralph-based monitoring flags items pending > 1 hour

### P1 — Improved UX
- **Priority sorting**: P0 items surface first
- **Bulk actions**: Approve/reject multiple items
- **Delegation**: Route items to specific people
- **Notifications**: Push via Teams/Slack/GitHub Discussions
- **Expiry**: Auto-reject items pending > N hours

### P2 — Dashboard
- **Web inbox**: Browser-based approval dashboard
- **Analytics**: Response times, approval rates, blockers
- **Cross-repo**: Aggregate approvals from multiple repos

## SDK Modules Used

| Module | Purpose |
|--------|---------|
| `platform.GitHubAdapter` | PR operations and labels |
| `platform.AzureDevOpsAdapter` | ADO work item operations |
| `platform.comms` | Notifications via Teams/Discussions |
| `state.DecisionsCollection` | Decision file tracking |
| `runtime.EventBus` | Emit approval events |
| `hooks.HookPipeline` | Gate actions on approval status |
| `ralph.RalphMonitor` | Stale item monitoring |

## Project Structure

```
src/
├── models/          # ApprovalItem data model
├── queue/           # In-memory queue logic
├── storage/         # File-based persistence
├── adapters/        # GitHub, Decision, ADO capture
├── cli/commands/    # CLI: inbox, approve, reject, delegate
├── monitoring/      # Ralph integration for stale tracking
├── notifications/   # Comms adapter dispatch
├── analytics/       # Metrics and reporting
└── web/             # Express server and dashboard

test/
├── models/          # Data model tests
├── queue/           # Queue logic tests
├── storage/         # Persistence tests
├── adapters/        # Adapter integration tests
├── cli/             # CLI command tests
├── monitoring/      # Monitor tests
├── notifications/   # Notification tests
├── analytics/       # Analytics tests
└── integration/     # End-to-end workflows
```

## TDD Implementation Plan

See **PLAN.md** for:
- Detailed feature breakdown by phase
- Test-first specifications for each feature
- Implementation strategy per phase
- Success metrics and dependencies

## Build & Test

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Build TypeScript
npm run build
```

## Getting Started

1. Read `PLAN.md` for the full TDD specification
2. Phase 1 (Core Data Model) is the starting point — begin with test files
3. Implement features in order per the build order in `PLAN.md`
4. Each phase has clear test contracts before implementation

## Success Metrics

| Metric | Target |
|--------|--------|
| Median approval latency | < 30 min (P0), < 15 min (P1+) |
| Stale approval rate | < 20% (P0), < 10% (P1+) |
| Approval precision | > 85% (P0), > 90% (P1+) |

## References

- [Squad SDK Documentation](https://github.com/bradygaster/squad)
- [PRD: Human Approval Hub](../07-human-approval-hub.md)
