#!/usr/bin/env node

import { ApprovalQueue } from '../queue/ApprovalQueue.js';
import { ApprovalStore } from '../storage/ApprovalStore.js';
import { ApprovalItem } from '../models/ApprovalItem.js';
import { InboxCommand } from './commands/inbox.js';
import { ApproveCommand } from './commands/approve.js';
import { RejectCommand } from './commands/reject.js';
import * as path from 'node:path';

const STORE_CONFIG = {
  pendingPath: path.join('.squad', 'approvals', 'pending.json'),
  historyPath: path.join('.squad', 'approvals', 'history'),
};

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = 'true';
      }
    }
  }
  return flags;
}

function printUsage(): void {
  console.log(`Usage: squad-approval <command> [options]

Commands:
  create   Create a new approval request
  list     List pending approvals
  approve  Approve a pending item
  reject   Reject a pending item
  status   Show queue summary (pending/approved/rejected/expired counts)

Options for 'create':
  --type <type>       Approval type: decision | github-pr | ado-escalation | policy-waiver
  --title <title>     Title of the approval item
  --agent <agent>     Agent or person submitting the request
  --reason <reason>   Reason or description for the request

Options for 'approve':
  <id>                ID of the item to approve
  --reason <reason>   Optional reason for approval

Options for 'reject':
  <id>                ID of the item to reject
  --reason <reason>   Required reason for rejection

Examples:
  squad-approval create --type decision --title "Use JWT" --agent keaton --reason "Auth decision"
  squad-approval list
  squad-approval approve github-pr-42 --reason "Looks good"
  squad-approval reject decision-123 --reason "Need more context"
  squad-approval status`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(command ? 0 : 1);
  }

  const store = new ApprovalStore(STORE_CONFIG);
  const queue = await store.load();

  switch (command) {
    case 'create': {
      const flags = parseFlags(args.slice(1));
      const type = flags['type'];
      const title = flags['title'];
      const agent = flags['agent'] || 'unknown';
      const reason = flags['reason'] || '';

      if (!type || !title) {
        console.error('Error: --type and --title are required for create');
        process.exit(1);
      }

      const validTypes = ['github-pr', 'decision', 'ado-escalation', 'policy-waiver'];
      if (!validTypes.includes(type)) {
        console.error(`Error: --type must be one of: ${validTypes.join(', ')}`);
        process.exit(1);
      }

      const id = `${type}-${Date.now()}`;
      const item = new ApprovalItem(id, type as any, title, reason || title);
      item.context.agentReasoning = `Submitted by ${agent}: ${reason}`;
      queue.add(item);
      await store.save(queue);
      console.log(`✓ Created approval: ${item.id}`);
      console.log(`  Type:  ${item.type}`);
      console.log(`  Title: ${item.title}`);
      break;
    }

    case 'list': {
      const inbox = new InboxCommand(queue);
      const output = await inbox.list();
      console.log(output);
      break;
    }

    case 'approve': {
      const positional = args.slice(1).filter(a => !a.startsWith('--'));
      const flags = parseFlags(args.slice(1));
      const id = positional[0];

      if (!id) {
        console.error('Error: item ID is required');
        process.exit(1);
      }

      const approveCmd = new ApproveCommand(queue);
      await approveCmd.execute(id, 'cli-user', flags['reason']);
      await store.save(queue);
      const item = queue.get(id)!;
      await store.archive(item);
      console.log(`✓ Approved: ${item.title}`);
      console.log(`  By: ${item.metadata.approvedBy}`);
      console.log(`  At: ${item.metadata.approvedAt?.toISOString()}`);
      break;
    }

    case 'reject': {
      const positional = args.slice(1).filter(a => !a.startsWith('--'));
      const flags = parseFlags(args.slice(1));
      const id = positional[0];
      const reason = flags['reason'];

      if (!id) {
        console.error('Error: item ID is required');
        process.exit(1);
      }
      if (!reason) {
        console.error('Error: --reason is required for reject');
        process.exit(1);
      }

      const rejectCmd = new RejectCommand(queue);
      await rejectCmd.execute(id, 'cli-user', reason);
      await store.save(queue);
      const item = queue.get(id)!;
      await store.archive(item);
      console.log(`✗ Rejected: ${item.title}`);
      console.log(`  Reason: ${item.metadata.rejectionReason}`);
      console.log(`  By: ${item.metadata.rejectedBy}`);
      break;
    }

    case 'status': {
      const pending = queue.pending();
      const approved = queue.approved();
      const rejected = queue.rejected();
      const expired = queue.expired();
      console.log('Approval Queue Status');
      console.log('─'.repeat(30));
      console.log(`  Pending:  ${pending.length}`);
      console.log(`  Approved: ${approved.length}`);
      console.log(`  Rejected: ${rejected.length}`);
      console.log(`  Expired:  ${expired.length}`);
      console.log(`  Total:    ${queue.size()}`);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
