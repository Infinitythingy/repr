import { z } from 'zod'
import type {
  ControlItem,
  GitLabIssueDraft,
  McpActionDraft,
  MissionPlan,
  MissionRequest,
  MissionStage,
  ReportDraft,
} from '../src/shared/mission'
import { generatePlanWithGemini } from './providers/gemini'

const dataSourceSchema = z.enum([
  'ERP export',
  'Payments ledger',
  'GL spreadsheet',
  'Fraud queue',
  'Vendor register',
  'GitLab project',
])

export const missionRequestSchema = z.object({
  goal: z.string().trim().min(20).max(2400),
  context: z.string().trim().min(10).max(2400),
  urgency: z.enum(['standard', 'accelerated', 'critical']),
  approvalMode: z.enum(['manual', 'two_person', 'auto_draft']),
  dataSources: z.array(dataSourceSchema).min(1),
  constraints: z.array(z.string().trim().min(3).max(240)).max(8),
})

export async function createMissionPlan(
  input: MissionRequest,
): Promise<MissionPlan> {
  if (process.env.GEMINI_API_KEY) {
    const generated = await generatePlanWithGemini(input).catch(() => null)
    if (generated) {
      return normalizePlan(generated, 'gemini')
    }
  }

  return normalizePlan(buildDeterministicPlan(input), 'deterministic')
}

function normalizePlan(
  partialPlan: Partial<MissionPlan>,
  agentMode: MissionPlan['agentMode'],
): MissionPlan {
  const fallback = buildDeterministicPlan({
    goal: 'Coordinate an audit-ready finance operations workflow.',
    context: 'Finance and operations need accountable execution.',
    urgency: 'accelerated',
    approvalMode: 'two_person',
    dataSources: ['GitLab project'],
    constraints: ['Attach evidence to every work item'],
  })

  return {
    ...fallback,
    ...partialPlan,
    missionId: partialPlan.missionId ?? fallback.missionId,
    title: trimTo(partialPlan.title, fallback.title, 86),
    executiveBrief: trimTo(
      partialPlan.executiveBrief,
      fallback.executiveBrief,
      520,
    ),
    createdAt: partialPlan.createdAt ?? new Date().toISOString(),
    agentMode,
    geminiModel:
      agentMode === 'gemini'
        ? process.env.GEMINI_MODEL ?? 'gemini-3-flash-preview'
        : 'deterministic-demo',
    riskScore: clampNumber(partialPlan.riskScore, fallback.riskScore, 1, 100),
    confidence: clampNumber(partialPlan.confidence, fallback.confidence, 0, 1),
    timeSavedHours: clampNumber(
      partialPlan.timeSavedHours,
      fallback.timeSavedHours,
      1,
      80,
    ),
    stages: ensureArray(partialPlan.stages, fallback.stages).slice(0, 7),
    gitlabIssues: ensureArray(
      partialPlan.gitlabIssues,
      fallback.gitlabIssues,
    ).slice(0, 8),
    reports: ensureArray(partialPlan.reports, fallback.reports).slice(0, 4),
    controls: ensureArray(partialPlan.controls, fallback.controls).slice(0, 6),
    mcpActions: ensureArray(partialPlan.mcpActions, fallback.mcpActions).slice(
      0,
      12,
    ),
    agentTrace: ensureArray(partialPlan.agentTrace, fallback.agentTrace).slice(
      0,
      8,
    ),
  }
}

function buildDeterministicPlan(input: MissionRequest): MissionPlan {
  const createdAt = new Date()
  const missionId = `mops-${createdAt.getTime().toString(36)}`
  const title = titleFromGoal(input.goal)
  const windowPrefix = input.urgency === 'critical' ? 'T+' : 'Day '

  const stages: MissionStage[] = [
    {
      id: 'intake',
      name: 'Frame the mission',
      objective:
        'Convert the ambiguous operating goal into scope, owners, risk limits, and approval checkpoints.',
      window: input.urgency === 'critical' ? 'T+0-2h' : `${windowPrefix}1`,
      owner: 'Ops lead',
      exitCriteria: 'Scope, constraints, and decision rights accepted',
    },
    {
      id: 'evidence-map',
      name: 'Map evidence sources',
      objective: `Connect ${input.dataSources.join(', ')} to each required decision and exception path.`,
      window: input.urgency === 'critical' ? 'T+2-6h' : `${windowPrefix}1`,
      owner: 'Finance systems',
      exitCriteria: 'Evidence checklist approved by finance and risk',
    },
    {
      id: 'gitlab-sync',
      name: 'Create GitLab execution lane',
      objective:
        'Create labels, milestone, issue drafts, and owner assignments through the GitLab MCP action layer.',
      window: input.urgency === 'critical' ? 'T+6-8h' : `${windowPrefix}1`,
      owner: 'MissionOps agent',
      exitCriteria: 'All work items are visible with due dates and labels',
    },
    {
      id: 'exception-work',
      name: 'Resolve exceptions',
      objective:
        'Drive reconciliation, remediation, and approvals until unresolved exceptions have explicit escalation paths.',
      window: input.urgency === 'standard' ? 'Day 2-4' : 'Day 2',
      owner: 'Workstream owners',
      exitCriteria: 'Open exceptions have owner, evidence, and ETA',
    },
    {
      id: 'reporting',
      name: 'Publish status pack',
      objective:
        'Generate executive, audit, and operations reports from the plan, tickets, decisions, and evidence trail.',
      window: input.urgency === 'critical' ? 'T+24h' : 'Daily',
      owner: 'Finance ops',
      exitCriteria: 'Reports sent and archived for review',
    },
  ]

  const issues: GitLabIssueDraft[] = [
    {
      title: `${title}: mission charter and approval map`,
      description:
        'Approve scope, risk thresholds, owner roster, and human approval checkpoints before execution starts.',
      owner: 'Finance ops lead',
      labels: ['missionops', 'approval', 'finance-ops'],
      dueDate: dueDate(1),
    },
    {
      title: `${title}: evidence source reconciliation`,
      description:
        'Map source records to each decision, note gaps, and attach sample evidence for audit review.',
      owner: 'Finance systems analyst',
      labels: ['missionops', 'evidence', 'reconciliation'],
      dueDate: dueDate(1),
    },
    {
      title: `${title}: exception triage queue`,
      description:
        'Group anomalies by value at risk, customer impact, age, and remediation owner.',
      owner: 'Operations manager',
      labels: ['missionops', 'exceptions', priorityLabel(input.urgency)],
      dueDate: dueDate(input.urgency === 'standard' ? 2 : 1),
    },
    {
      title: `${title}: controlled data correction lane`,
      description:
        'Create a finance-approved lane for data fixes with before/after evidence and rollback owner.',
      owner: 'Engineering partner',
      labels: ['missionops', 'data-fix', 'control'],
      dueDate: dueDate(2),
    },
    {
      title: `${title}: executive status digest`,
      description:
        'Publish daily status covering completed actions, blockers, risk movement, and decisions needed.',
      owner: 'Chief of staff',
      labels: ['missionops', 'reporting', 'exec'],
      dueDate: dueDate(1),
    },
    {
      title: `${title}: audit evidence archive`,
      description:
        'Compile final ticket links, evidence artifacts, approvals, and unresolved risk notes into one review pack.',
      owner: 'Audit liaison',
      labels: ['missionops', 'audit-pack', 'evidence'],
      dueDate: dueDate(3),
    },
  ]

  const reports: ReportDraft[] = [
    {
      title: 'Executive daily status',
      audience: 'CFO, controller, operations leadership',
      format: 'Exec memo',
      sections: ['Risk movement', 'Owner asks', 'Blocked items', 'Next 24h'],
    },
    {
      title: 'Audit evidence pack',
      audience: 'Internal audit and compliance reviewers',
      format: 'Audit pack',
      sections: ['Ticket trail', 'Approvals', 'Source evidence', 'Exceptions'],
    },
    {
      title: 'Operations digest',
      audience: 'Workstream owners',
      format: 'Ops digest',
      sections: ['Queue health', 'Overdue items', 'Escalations', 'Handoffs'],
    },
  ]

  const controls: ControlItem[] = [
    {
      name: 'Two-person approval',
      owner: approvalOwner(input.approvalMode),
      evidence: 'Approval comment or linked sign-off issue before correction',
      risk: 'High',
    },
    {
      name: 'Ticket-linked evidence',
      owner: 'Audit liaison',
      evidence: 'Every GitLab issue contains source pointer and artifact link',
      risk: 'Medium',
    },
    {
      name: 'Aged exception escalation',
      owner: 'Ops lead',
      evidence: 'SLA label and escalation comment on exceptions beyond limit',
      risk: input.urgency === 'critical' ? 'High' : 'Medium',
    },
    {
      name: 'PII-safe reporting',
      owner: 'Risk operations',
      evidence: 'Reports use case IDs and redacted account references only',
      risk: 'High',
    },
  ]

  const mcpActions: McpActionDraft[] = [
    {
      tool: 'list_tools',
      target: 'GitLab MCP server',
      payloadSummary: 'Discover issue, label, milestone, and comment tools',
    },
    {
      tool: 'create_label',
      target: 'MissionOps labels',
      payloadSummary: 'Create missionops, evidence, reporting, and control labels',
    },
    {
      tool: 'create_milestone',
      target: title,
      payloadSummary: 'Create a mission milestone for due dates and reporting',
    },
    ...issues.map((issue) => ({
      tool: 'create_issue',
      target: issue.title,
      payloadSummary: `${issue.owner}; ${issue.labels.join(', ')}`,
    })),
  ]

  return {
    missionId,
    title,
    executiveBrief: `${input.goal} MissionOps converts it into ${issues.length} accountable GitLab work items, ${reports.length} report outputs, and ${controls.length} control checks with human approval gates.`,
    createdAt: createdAt.toISOString(),
    agentMode: 'deterministic',
    geminiModel: 'deterministic-demo',
    riskScore:
      input.urgency === 'critical' ? 88 : input.urgency === 'accelerated' ? 76 : 62,
    confidence: input.approvalMode === 'auto_draft' ? 0.8 : 0.88,
    timeSavedHours: input.urgency === 'critical' ? 26 : 18,
    stages,
    gitlabIssues: issues,
    reports,
    controls,
    mcpActions,
    agentTrace: [
      'Parsed mission goal and extracted operational constraints',
      'Selected GitLab MCP as the execution system of record',
      'Created staged plan with human approval boundaries',
      'Drafted issues, labels, reports, and audit controls',
      'Prepared MCP tool calls for approved execution',
    ],
  }
}

function titleFromGoal(goal: string): string {
  const cleaned = goal
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 7)
    .join(' ')

  return cleaned
    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    : 'Finance operations mission'
}

function dueDate(offsetDays: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function priorityLabel(urgency: MissionRequest['urgency']): string {
  if (urgency === 'critical') return 'priority-critical'
  if (urgency === 'accelerated') return 'priority-high'
  return 'priority-normal'
}

function approvalOwner(approvalMode: MissionRequest['approvalMode']): string {
  if (approvalMode === 'two_person') return 'Finance approver + risk approver'
  if (approvalMode === 'auto_draft') return 'MissionOps draft reviewer'
  return 'Finance approver'
}

function trimTo(
  value: string | undefined,
  fallback: string,
  maxLength: number,
): string {
  const source = value?.trim() || fallback
  return source.length > maxLength ? `${source.slice(0, maxLength - 1)}...` : source
}

function clampNumber(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function ensureArray<T>(value: T[] | undefined, fallback: T[]): T[] {
  return Array.isArray(value) && value.length > 0 ? value : fallback
}
