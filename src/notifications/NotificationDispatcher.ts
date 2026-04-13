export interface QuietHoursConfig {
  startHour: number; // 0-23
  endHour: number;   // 0-23
  enabled: boolean;
}

export interface NotificationMessage {
  adapter: string;
  itemId: string;
  title: string;
  body: string;
  approvalLink?: string;
}

export type AdapterSender = (message: NotificationMessage) => Promise<void>;

export class NotificationDispatcher {
  private adapters: Map<string, AdapterSender> = new Map();
  private quietHours: QuietHoursConfig = { startHour: 19, endHour: 8, enabled: true };
  private sentNotifications: NotificationMessage[] = [];

  registerAdapter(name: string, sender: AdapterSender): void {
    this.adapters.set(name, sender);
  }

  setQuietHours(config: QuietHoursConfig): void {
    this.quietHours = config;
  }

  getSentNotifications(): NotificationMessage[] {
    return this.sentNotifications;
  }

  shouldSendNotification(now: Date = new Date()): boolean {
    if (!this.quietHours.enabled) return true;
    const hour = now.getHours();
    if (this.quietHours.startHour > this.quietHours.endHour) {
      // Wraps midnight (e.g., 19-8)
      return hour < this.quietHours.startHour && hour >= this.quietHours.endHour;
    }
    // Same-day range (e.g., 22-6)
    return hour < this.quietHours.startHour || hour >= this.quietHours.endHour;
  }

  async sendToComms(adapter: string, itemId: string, title: string, approvalLink: string): Promise<void> {
    if (!this.shouldSendNotification()) return;

    const message: NotificationMessage = {
      adapter,
      itemId,
      title,
      body: `Approval required: ${title}`,
      approvalLink,
    };

    const sender = this.adapters.get(adapter);
    if (sender) {
      await sender(message);
    }
    this.sentNotifications.push(message);
  }

  async sendApprovalRequest(itemId: string, itemType: string, title: string): Promise<void> {
    if (!this.shouldSendNotification()) return;

    const message: NotificationMessage = {
      adapter: 'default',
      itemId,
      title,
      body: `New ${itemType} approval request: ${title}`,
    };
    this.sentNotifications.push(message);

    for (const [name, sender] of this.adapters) {
      await sender({ ...message, adapter: name });
    }
  }

  async sendReminder(itemId: string, age: string): Promise<void> {
    if (!this.shouldSendNotification()) return;

    const message: NotificationMessage = {
      adapter: 'default',
      itemId,
      title: `Reminder: Pending approval ${itemId}`,
      body: `Item ${itemId} has been pending for ${age}`,
    };
    this.sentNotifications.push(message);

    for (const [name, sender] of this.adapters) {
      await sender({ ...message, adapter: name });
    }
  }
}
