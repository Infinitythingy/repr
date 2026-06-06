import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type {
  GitLabIssueDraft,
  McpActionResult,
  McpExecutionLog,
  MissionPlan,
} from '../src/shared/mission'

type McpTool = {
  name: string
  description?: string
  inputSchema?: {
    properties?: Record<string, unknown>
    required?: string[]
  }
}

type LabelDefinition = {
  name: string
  color: string
  description: string
}

type MilestoneDefinition = {
  window: string
  title: string
  description: string
  dueDate?: string
}

const LABEL_CATALOG: Record<string, LabelDefinition> = {
  missionops: {
    name: 'missionops',
    color: '#0f766e',
    description: 'MissionOps agent generated work item',
  },
  approval: {
    name: 'approval',
    color: '#f59e0b',
    description: 'Requires explicit human approval or sign-off evidence',
  },
  'finance-ops': {
    name: 'finance-ops',
    color: '#14b8a6',
    description: 'Finance operations owned work',
  },
  evidence: {
    name: 'evidence',
    color: '#2563eb',
    description: 'Requires audit evidence or source artifact links',
  },
  reconciliation: {
    name: 'reconciliation',
    color: '#6366f1',
    description: 'Reconciliation, matching, or variance review',
  },
  exceptions: {
    name: 'exceptions',
    color: '#f97316',
    description: 'Exception triage and remediation queue',
  },
  'priority-high': {
    name: 'priority-high',
    color: '#dc2626',
    description: 'High priority work item',
  },
  'priority-critical': {
    name: 'priority-critical',
    color: '#991b1b',
    description: 'Critical priority work item',
  },
  'priority-normal': {
    name: 'priority-normal',
    color: '#64748b',
    description: 'Normal priority work item',
  },
  'data-fix': {
    name: 'data-fix',
    color: '#7c3aed',
    description: 'Controlled data correction work',
  },
  control: {
    name: 'control',
    color: '#059669',
    description: 'Risk control or approval guardrail',
  },
  reporting: {
    name: 'reporting',
    color: '#0891b2',
    description: 'Status reporting and stakeholder communication',
  },
  exec: {
    name: 'exec',
    color: '#334155',
    description: 'Executive-facing deliverable',
  },
  'audit-pack': {
    name: 'audit-pack',
    color: '#9333ea',
    description: 'Audit package assembly and evidence archive',
  },
}

export async function executeGitLabMission(
  plan: MissionPlan,
): Promise<McpExecutionLog> {
  const startedAt = new Date().toISOString()
  const command = process.env.GITLAB_MCP_COMMAND
  const forceDemo = process.env.MISSIONOPS_MCP_MODE === 'demo'

  if (!command || forceDemo) {
    return {
      missionId: plan.missionId,
      mode: 'Simulated MCP',
      startedAt,
      completedAt: new Date().toISOString(),
      actions: simulateActions(plan),
    }
  }

  try {
    const actions = await withTimeout(
      executeLiveMcp(plan, command),
      Number(process.env.GITLAB_MCP_TIMEOUT_MS ?? 15_000),
    )
    return {
      missionId: plan.missionId,
      mode: 'Live GitLab MCP',
      startedAt,
      completedAt: new Date().toISOString(),
      actions,
    }
  } catch (error) {
    return {
      missionId: plan.missionId,
      mode: 'Live GitLab MCP',
      startedAt,
      completedAt: new Date().toISOString(),
      actions: [
        {
          id: 'mcp-error',
          title: 'GitLab MCP connection needs attention',
          detail:
            error instanceof Error
              ? error.message
              : 'Unknown MCP execution error',
          status: 'failed',
        },
        ...simulateActions(plan).slice(0, 4),
      ],
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`GitLab MCP execution timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function simulateActions(plan: MissionPlan): McpActionResult[] {
  const labels = labelDefinitionsFor(plan)
  const milestones = milestoneDefinitionsFor(plan)

  const labelAction: McpActionResult = {
    id: 'sim-labels',
    title: 'Prepared color-coded MissionOps labels',
    detail: labels
      .map((label) => `${label.name} ${label.color}`)
      .join(', '),
    status: 'simulated',
  }

  const milestoneActions = milestones.map((milestone) => ({
    id: `sim-milestone-${slugify(milestone.window)}`,
    title: `Prepared milestone: ${milestone.title}`,
    detail: `${milestone.window} due ${milestone.dueDate ?? 'TBD'}; links issue due dates to the demo timeline`,
    status: 'simulated' as const,
  }))

  const issueActions = plan.gitlabIssues.map((issue, index) => ({
    id: `sim-issue-${index + 1}`,
    title: `Drafted issue: ${issue.title}`,
    detail: `${issue.owner}; due ${issue.dueDate}; milestone ${milestoneForIssue(plan, issue)?.title ?? 'unmapped'}; labels ${issue.labels.join(', ')}`,
    status: 'simulated' as const,
  }))

  const reportAction: McpActionResult = {
    id: 'sim-report',
    title: 'Attached report pack outline',
    detail: `${plan.reports.length} report drafts linked back to mission issues`,
    status: 'simulated',
  }

  return [labelAction, ...milestoneActions, ...issueActions, reportAction]
}

async function executeLiveMcp(
  plan: MissionPlan,
  command: string,
): Promise<McpActionResult[]> {
  const client = new Client({
    name: 'missionops-gitlab-mcp-client',
    version: '1.0.0',
  })
  const transport = new StdioClientTransport({
    command,
    args: splitArgs(process.env.GITLAB_MCP_ARGS ?? ''),
    env: cleanEnv(process.env),
  })

  await client.connect(transport)
  try {
    const listResult = await client.listTools()
    const tools = (listResult.tools ?? []) as McpTool[]
    const createIssueTool = selectTool(tools, ['create', 'issue'])
    const createLabelTool = selectTool(tools, ['create', 'label'])
    const createMilestoneTool = selectTool(tools, ['create', 'milestone'])

    const actions: McpActionResult[] = [
      {
        id: 'tools-listed',
        title: 'Discovered GitLab MCP tools',
        detail: `${tools.length} tools available from configured server`,
        status: 'completed',
      },
    ]

    if (createLabelTool) {
      for (const label of labelDefinitionsFor(plan)) {
        const raw = await client.callTool({
          name: createLabelTool.name,
          arguments: shapeGenericArgs(createLabelTool, {
            name: label.name,
            label: label.name,
            color: label.color,
            description: label.description,
          }),
        })
        actions.push({
          id: `label-created-${slugify(label.name)}`,
          title: `Created color-coded label: ${label.name}`,
          detail: `${label.color} via ${createLabelTool.name}`,
          status: 'completed',
          raw,
        })
      }
    }

    if (createMilestoneTool) {
      for (const milestone of milestoneDefinitionsFor(plan)) {
        const raw = await client.callTool({
          name: createMilestoneTool.name,
          arguments: shapeGenericArgs(createMilestoneTool, {
            title: milestone.title,
            name: milestone.title,
            description: milestone.description,
            due_date: milestone.dueDate,
            dueDate: milestone.dueDate,
          }),
        })
        actions.push({
          id: `milestone-created-${slugify(milestone.window)}`,
          title: `Created milestone: ${milestone.title}`,
          detail: `${milestone.window} due ${milestone.dueDate ?? 'TBD'} via ${createMilestoneTool.name}`,
          status: 'completed',
          raw,
        })
      }
    }

    if (!createIssueTool) {
      throw new Error('No issue creation tool was exposed by the GitLab MCP server')
    }

    for (const [index, issue] of plan.gitlabIssues.entries()) {
      const raw = await client.callTool({
        name: createIssueTool.name,
        arguments: shapeIssueArgs(createIssueTool, issue, plan),
      })
      actions.push({
        id: `issue-created-${index + 1}`,
        title: `Created GitLab issue: ${issue.title}`,
        detail: createIssueTool.name,
        status: 'completed',
        raw,
      })
    }

    return actions
  } finally {
    await client.close()
  }
}

function selectTool(tools: McpTool[], keywords: string[]): McpTool | undefined {
  return tools.find((tool) => {
    const haystack = `${tool.name} ${tool.description ?? ''}`.toLowerCase()
    return keywords.every((keyword) => haystack.includes(keyword))
  })
}

function shapeIssueArgs(
  tool: McpTool,
  issue: GitLabIssueDraft,
  plan: MissionPlan,
): Record<string, unknown> {
  const milestone = milestoneForIssue(plan, issue)

  return shapeGenericArgs(tool, {
    id: process.env.GITLAB_PROJECT_ID,
    project_id: process.env.GITLAB_PROJECT_ID,
    projectId: process.env.GITLAB_PROJECT_ID,
    title: issue.title,
    description: `${issue.description}\n\nMission: ${plan.missionId}\nOwner: ${issue.owner}`,
    labels: issue.labels,
    label_names: issue.labels,
    due_date: issue.dueDate,
    dueDate: issue.dueDate,
    milestone: milestone?.title,
    milestone_title: milestone?.title,
    milestone_name: milestone?.title,
  })
}

function shapeGenericArgs(
  tool: McpTool,
  candidates: Record<string, unknown>,
): Record<string, unknown> {
  const properties = tool.inputSchema?.properties
  if (!properties) return candidates

  const shaped: Record<string, unknown> = {}
  for (const key of Object.keys(properties)) {
    if (key in candidates && candidates[key] !== undefined) {
      shaped[key] = candidates[key]
      continue
    }
    const lower = key.toLowerCase()
    if (lower.includes('project') && process.env.GITLAB_PROJECT_ID) {
      shaped[key] = process.env.GITLAB_PROJECT_ID
    }
    if (lower === 'name') {
      shaped[key] = candidates.name ?? candidates.title
    }
    if (lower === 'title') {
      shaped[key] = candidates.title ?? candidates.name
    }
    if (lower === 'color') {
      shaped[key] = candidates.color
    }
    if (lower === 'body' || lower.includes('description')) {
      shaped[key] = candidates.description
    }
    if (lower.includes('label')) {
      shaped[key] = candidates.labels ?? candidates.label ?? candidates.name
    }
    if (lower.includes('due')) {
      shaped[key] = candidates.due_date
    }
    if (lower.includes('milestone') && !lower.includes('id')) {
      shaped[key] =
        candidates.milestone ?? candidates.milestone_title ?? candidates.milestone_name
    }
  }
  return shaped
}

function labelDefinitionsFor(plan: MissionPlan): LabelDefinition[] {
  const names = new Set<string>(['missionops'])
  for (const issue of plan.gitlabIssues) {
    for (const label of issue.labels) {
      names.add(label)
    }
  }

  return [...names].map((name) => LABEL_CATALOG[name] ?? fallbackLabel(name))
}

function fallbackLabel(name: string): LabelDefinition {
  return {
    name,
    color: deterministicColor(name),
    description: `MissionOps generated label: ${name}`,
  }
}

function deterministicColor(value: string): string {
  const colors = ['#0f766e', '#2563eb', '#7c3aed', '#dc2626', '#0891b2']
  const total = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return colors[total % colors.length]
}

function milestoneDefinitionsFor(plan: MissionPlan): MilestoneDefinition[] {
  const windows = new Map<string, MilestoneDefinition>()
  for (const issue of plan.gitlabIssues) {
    const window = dayWindowForIssue(plan, issue)
    if (!window) continue

    windows.set(window, {
      window,
      title: `${plan.title} - ${window}`,
      description: `${window} MissionOps work for ${plan.missionId}. Issues in this milestone share due dates, owners, labels, and audit evidence expectations.`,
      dueDate: issue.dueDate,
    })
  }

  return [...windows.values()].sort((left, right) => {
    return dayNumber(left.window) - dayNumber(right.window)
  })
}

function milestoneForIssue(
  plan: MissionPlan,
  issue: GitLabIssueDraft,
): MilestoneDefinition | undefined {
  const window = dayWindowForIssue(plan, issue)
  return milestoneDefinitionsFor(plan).find((milestone) => milestone.window === window)
}

function dayWindowForIssue(
  plan: MissionPlan,
  issue: GitLabIssueDraft,
): string | undefined {
  const createdAt = new Date(plan.createdAt)
  const dueDate = new Date(`${issue.dueDate}T00:00:00.000Z`)
  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(dueDate.getTime())) {
    return undefined
  }

  const createdDay = Date.UTC(
    createdAt.getUTCFullYear(),
    createdAt.getUTCMonth(),
    createdAt.getUTCDate(),
  )
  const dueDay = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
  )
  const offset = Math.max(1, Math.round((dueDay - createdDay) / 86_400_000))
  return `Day ${offset}`
}

function dayNumber(window: string): number {
  const match = window.match(/\d+/)
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function splitArgs(value: string): string[] {
  const matches = value.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []
  return matches.map((item) => item.replace(/^"|"$/g, ''))
}

function cleanEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}
