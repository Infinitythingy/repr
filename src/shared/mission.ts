export type Urgency = 'standard' | 'accelerated' | 'critical'

export type ApprovalMode = 'manual' | 'two_person' | 'auto_draft'

export type DataSource =
  | 'ERP export'
  | 'Payments ledger'
  | 'GL spreadsheet'
  | 'Fraud queue'
  | 'Vendor register'
  | 'GitLab project'

export type AgentMode = 'gemini' | 'deterministic'

export type MissionRequest = {
  goal: string
  context: string
  urgency: Urgency
  approvalMode: ApprovalMode
  dataSources: DataSource[]
  constraints: string[]
}

export type MissionStage = {
  id: string
  name: string
  objective: string
  window: string
  owner: string
  exitCriteria: string
}

export type GitLabIssueDraft = {
  title: string
  description: string
  owner: string
  labels: string[]
  dueDate: string
}

export type ReportDraft = {
  title: string
  audience: string
  format: 'Exec memo' | 'Audit pack' | 'Ops digest'
  sections: string[]
}

export type ControlItem = {
  name: string
  owner: string
  evidence: string
  risk: 'Low' | 'Medium' | 'High'
}

export type McpActionDraft = {
  tool: string
  target: string
  payloadSummary: string
}

export type MissionPlan = {
  missionId: string
  title: string
  executiveBrief: string
  createdAt: string
  agentMode: AgentMode
  geminiModel: string
  riskScore: number
  confidence: number
  timeSavedHours: number
  stages: MissionStage[]
  gitlabIssues: GitLabIssueDraft[]
  reports: ReportDraft[]
  controls: ControlItem[]
  mcpActions: McpActionDraft[]
  agentTrace: string[]
}

export type McpActionResult = {
  id: string
  title: string
  detail: string
  status: 'completed' | 'simulated' | 'failed'
  raw?: unknown
}

export type McpExecutionLog = {
  missionId: string
  mode: 'Live GitLab MCP' | 'Simulated MCP'
  startedAt: string
  completedAt: string
  actions: McpActionResult[]
}

export const defaultMissionRequest: MissionRequest = {
  goal:
    'Coordinate a quarter-end revenue recognition close across finance, data, and engineering. Reconcile anomalies, assign owners, open audit-ready tickets, and publish daily executive status.',
  context:
    'The finance operations team has three days to close. Revenue exceptions are scattered across ERP exports, payment processor reports, spreadsheets, and engineering-owned data fixes.',
  urgency: 'accelerated',
  approvalMode: 'two_person',
  dataSources: [
    'ERP export',
    'Payments ledger',
    'GL spreadsheet',
    'GitLab project',
  ],
  constraints: [
    'Keep SOX evidence attached to each work item',
    'Require finance owner approval before any data correction',
    'Escalate exceptions older than 24 hours',
  ],
}

export const missionPresets = [
  {
    id: 'close',
    label: 'Close',
    request: defaultMissionRequest,
  },
  {
    id: 'fraud',
    label: 'Fraud surge',
    request: {
      goal:
        'Stand up a 48-hour fraud operations response for a spike in suspicious ACH returns. Triage cases, assign investigation owners, and produce regulator-ready evidence.',
      context:
        'Risk operations needs a single command lane across payment events, fraud queue notes, customer impact, and engineering controls.',
      urgency: 'critical',
      approvalMode: 'manual',
      dataSources: ['Payments ledger', 'Fraud queue', 'GitLab project'],
      constraints: [
        'Never expose full customer account identifiers in tickets',
        'Escalate losses above $25,000 immediately',
        'Require risk lead approval before customer outreach',
      ],
    } satisfies MissionRequest,
  },
  {
    id: 'vendor',
    label: 'Vendor risk',
    request: {
      goal:
        'Prepare a vendor risk remediation sprint after a critical third-party audit finding. Convert the finding into owners, evidence requests, due dates, and executive reporting.',
      context:
        'Procurement, finance, security, and operations need shared accountability before the next board risk review.',
      urgency: 'accelerated',
      approvalMode: 'two_person',
      dataSources: ['Vendor register', 'GL spreadsheet', 'GitLab project'],
      constraints: [
        'Map every remediation item to an audit evidence artifact',
        'Separate procurement approvals from technical remediation',
        'Publish daily blocker digest',
      ],
    } satisfies MissionRequest,
  },
] as const
