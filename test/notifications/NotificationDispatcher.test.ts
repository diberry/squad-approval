import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationDispatcher } from '../../src/notifications/NotificationDispatcher.js';

describe('NotificationDispatcher', () => {
  let dispatcher: NotificationDispatcher;

  beforeEach(() => {
    dispatcher = new NotificationDispatcher();
  });

  it('sendToComms() routes notification to GitHub/ADO/Teams', async () => {
    const sent: any[] = [];
    dispatcher.registerAdapter('teams', async (msg) => { sent.push(msg); });

    await dispatcher.sendToComms('teams', 'item-1', 'PR approval needed', 'https://example.com/approve/item-1');
    expect(sent).toHaveLength(1);
    expect(sent[0].adapter).toBe('teams');
    expect(sent[0].itemId).toBe('item-1');
    expect(sent[0].approvalLink).toBe('https://example.com/approve/item-1');
  });

  it('templates messages per channel', async () => {
    const teamsMsgs: any[] = [];
    const ghMsgs: any[] = [];
    dispatcher.registerAdapter('teams', async (msg) => { teamsMsgs.push(msg); });
    dispatcher.registerAdapter('github', async (msg) => { ghMsgs.push(msg); });

    await dispatcher.sendApprovalRequest('item-2', 'github-pr', 'Fix login');
    expect(teamsMsgs).toHaveLength(1);
    expect(ghMsgs).toHaveLength(1);
    expect(teamsMsgs[0].body).toContain('github-pr');
  });

  it('shouldSendNotification() respects quiet hours', () => {
    dispatcher.setQuietHours({ startHour: 19, endHour: 8, enabled: true });

    // 10 AM should send
    const morning = new Date();
    morning.setHours(10, 0, 0, 0);
    expect(dispatcher.shouldSendNotification(morning)).toBe(true);

    // 9 PM should not send (quiet hours)
    const evening = new Date();
    evening.setHours(21, 0, 0, 0);
    expect(dispatcher.shouldSendNotification(evening)).toBe(false);

    // 3 AM should not send (quiet hours)
    const night = new Date();
    night.setHours(3, 0, 0, 0);
    expect(dispatcher.shouldSendNotification(night)).toBe(false);

    // Disabled quiet hours always sends
    dispatcher.setQuietHours({ startHour: 19, endHour: 8, enabled: false });
    expect(dispatcher.shouldSendNotification(evening)).toBe(true);
  });

  it('sendApprovalRequest() notifies with context', async () => {
    const sent: any[] = [];
    dispatcher.registerAdapter('default', async (msg) => { sent.push(msg); });

    await dispatcher.sendApprovalRequest('item-3', 'decision', 'Use Redis');
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toContain('decision');
    expect(sent[0].body).toContain('Use Redis');
  });

  it('sendReminder() escalates stale items', async () => {
    const sent: any[] = [];
    dispatcher.registerAdapter('teams', async (msg) => { sent.push(msg); });

    await dispatcher.sendReminder('item-4', '2h 30m');
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toContain('item-4');
    expect(sent[0].body).toContain('2h 30m');
  });
});
