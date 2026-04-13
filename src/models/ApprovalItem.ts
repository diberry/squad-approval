export interface ApprovalItemContext {
  agentReasoning?: string;
  affectedFiles?: string[];
  relatedDecisions?: string[];
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type ApprovalType = 'github-pr' | 'decision' | 'ado-escalation' | 'policy-waiver';

export interface ApprovalItemMetadata {
  githubPRNumber?: number;
  githubPRUrl?: string;
  decisionPath?: string;
  adoWorkItemId?: string;
  adoWorkItemUrl?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  delegatedTo?: string;
}

export class ApprovalItem {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  status: ApprovalStatus;
  createdAt: Date;
  expiresAt?: Date;
  metadata: ApprovalItemMetadata;
  context: ApprovalItemContext;

  constructor(
    id: string,
    type: ApprovalType,
    title: string,
    description: string,
    createdAt: Date = new Date()
  ) {
    this.id = id;
    this.type = type;
    this.title = title;
    this.description = description;
    this.status = 'pending';
    this.createdAt = createdAt;
    this.metadata = {};
    this.context = {};
  }

  static fromGitHubPR(prNumber: number, prUrl: string, title: string, description: string): ApprovalItem {
    const item = new ApprovalItem(
      `github-pr-${prNumber}`,
      'github-pr',
      title,
      description
    );
    item.metadata.githubPRNumber = prNumber;
    item.metadata.githubPRUrl = prUrl;
    return item;
  }

  static fromDecisionFile(filePath: string, title: string, agentReasoning: string): ApprovalItem {
    const item = new ApprovalItem(
      `decision-${Date.now()}`,
      'decision',
      title,
      agentReasoning
    );
    item.metadata.decisionPath = filePath;
    item.context.agentReasoning = agentReasoning;
    return item;
  }

  static fromADOWorkItem(workItemId: string, workItemUrl: string, title: string, priority: string): ApprovalItem {
    const item = new ApprovalItem(
      `ado-escalation-${workItemId}`,
      'ado-escalation',
      title,
      `Priority: ${priority}`
    );
    item.metadata.adoWorkItemId = workItemId;
    item.metadata.adoWorkItemUrl = workItemUrl;
    return item;
  }

  getContext(): ApprovalItemContext {
    return {
      agentReasoning: this.context.agentReasoning,
      affectedFiles: this.context.affectedFiles,
      relatedDecisions: this.context.relatedDecisions,
    };
  }

  approve(approvedBy: string): void {
    this.status = 'approved';
    this.metadata.approvedBy = approvedBy;
    this.metadata.approvedAt = new Date();
  }

  reject(rejectedBy: string, reason: string): void {
    this.status = 'rejected';
    this.metadata.rejectedBy = rejectedBy;
    this.metadata.rejectedAt = new Date();
    this.metadata.rejectionReason = reason;
  }

  expire(): void {
    this.status = 'expired';
  }

  getAge(): number {
    return Date.now() - this.createdAt.getTime();
  }

  isStale(thresholdMs: number = 3600000): boolean {
    return this.getAge() > thresholdMs && this.status === 'pending';
  }
}
