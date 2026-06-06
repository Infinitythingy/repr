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
    const actions = await executeLiveMcp(plan, command)
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

function simulateActions(plan: MissionPlan): McpActionResult[] {
  const labelAction: McpActionResult = {
    id: 'sim-labels',
    title: 'Prepared MissionOps labels',
    detail: 'missionops, evidence, reporting, control, and priority labels queued',
    status: 'simulated',
  }

  const milestoneAction: McpActionResult = {
    id: 'sim-milestone',
    title: `Prepared milestone: ${plan.title}`,
    detail: 'Milestone links ticket due dates to executive reporting cadence',
    status: 'simulated',
  }

  const issueActions = plan.gitlabIssues.map((issue, index) => ({
    id: `sim-issue-${index + 1}`,
    title: `Drafted issue: ${issue.title}`,
    detail: `${issue.owner}; due ${issue.dueDate}; labels ${issue.labels.join(', ')}`,
    status: 'simulated' as const,
  }))

  const reportAction: McpActionResult = {
    id: 'sim-report',
    title: 'Attached report pack outline',
    detail: `${plan.reports.length} report drafts linked back to mission issues`,
    status: 'simulated',
  }

  return [labelAction, milestoneAction, ...issueActions, reportAction]
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
      const raw = await client.callTool({
        name: createLabelTool.name,
        arguments: shapeGenericArgs(createLabelTool, {
          name: 'missionops',
          color: '#0f766e',
          description: 'MissionOps agent generated work item',
        }),
      })
      actions.push({
        id: 'labels-created',
        title: 'Created MissionOps label',
        detail: createLabelTool.name,
        status: 'completed',
        raw,
      })
    }

    if (createMilestoneTool) {
      const raw = await client.callTool({
        name: createMilestoneTool.name,
        arguments: shapeGenericArgs(createMilestoneTool, {
          title: plan.title,
          description: plan.executiveBrief,
          due_date: plan.gitlabIssues.at(-1)?.dueDate,
        }),
      })
      actions.push({
        id: 'milestone-created',
        title: 'Created mission milestone',
        detail: createMilestoneTool.name,
        status: 'completed',
        raw,
      })
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
  return shapeGenericArgs(tool, {
    id: process.env.GITLAB_PROJECT_ID,
    project_id: process.env.GITLAB_PROJECT_ID,
    projectId: process.env.GITLAB_PROJECT_ID,
    title: issue.title,
    description: `${issue.description}\n\nMission: ${plan.missionId}\nOwner: ${issue.owner}`,
    labels: issue.labels,
    label_names: issue.labels,
    due_date: issue.dueDate,
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
    if (lower === 'body' || lower.includes('description')) {
      shaped[key] = candidates.description
    }
    if (lower.includes('label')) {
      shaped[key] = candidates.labels ?? candidates.name
    }
    if (lower.includes('due')) {
      shaped[key] = candidates.due_date
    }
  }
  return shaped
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
