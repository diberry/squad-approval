export async function startWebServer(port: number = 3000): Promise<void> {
  // TODO: Create Express/Hono server
  // Add /api/approvals endpoint
  // Serve static HTML dashboard
}

export interface ApprovalAPIResponse {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  age: string;
}

export async function getApprovalsJSON(): Promise<ApprovalAPIResponse[]> {
  // TODO: Return pending items as JSON
  return [];
}
