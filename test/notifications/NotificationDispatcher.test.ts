import { describe, it, expect } from 'vitest';
import { NotificationDispatcher } from '../../src/notifications/NotificationDispatcher.js';

describe('NotificationDispatcher', () => {
  it('sendToComms() routes notification to GitHub/ADO/Teams', async () => {
    // TODO: Test adapter routing
  });

  it('templates messages per channel', async () => {
    // TODO: Test message formatting per adapter
  });

  it('shouldSendNotification() respects quiet hours', async () => {
    // TODO: Test quiet hours logic (7PM-8AM)
  });

  it('sendApprovalRequest() notifies with context', async () => {
    // TODO: Test approval request dispatch
  });

  it('sendReminder() escalates stale items', async () => {
    // TODO: Test reminder notification
  });
});
