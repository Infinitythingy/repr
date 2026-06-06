import type { Handler } from '@netlify/functions'
import type { MissionPlan } from '../../src/shared/mission'
import { validateExecutionApproval } from '../../server/approval'
import { auditLog } from '../../server/auditLog'
import { executeGitLabMission } from '../../server/gitlabMcp'
import { createMissionPlan, missionRequestSchema } from '../../server/missionAgent'

export const handler: Handler = async (event) => {
  const path = normalizePath(event.path)

  if (event.httpMethod === 'GET' && path === '/health') {
    return json(200, {
      ok: true,
      service: 'missionops-agent',
      mcpMode: process.env.GITLAB_MCP_COMMAND ? 'live-capable' : 'demo',
    })
  }

  if (event.httpMethod === 'POST' && path === '/mission/plan') {
    const parsedBody = parseBody(event.body)
    const parsed = missionRequestSchema.safeParse(parsedBody)
    if (!parsed.success) {
      return json(400, {
        error: parsed.error.issues.at(0)?.message ?? 'Invalid mission request',
      })
    }

    const plan = await createMissionPlan(parsed.data)
    auditLog('mission_plan_created', {
      missionId: plan.missionId,
      mode: plan.agentMode,
      riskScore: plan.riskScore,
      issues: plan.gitlabIssues.length,
      anomalies: plan.groundingSummary.anomalies.length,
    })
    return json(200, { plan })
  }

  if (event.httpMethod === 'POST' && path === '/mission/execute') {
    const parsedBody = parseBody(event.body) as { plan?: MissionPlan; approval?: unknown }
    if (!parsedBody.plan?.missionId || !Array.isArray(parsedBody.plan.gitlabIssues)) {
      return json(400, { error: 'Mission plan is required' })
    }

    const approvalError = validateExecutionApproval(
      parsedBody.plan,
      parsedBody.approval,
    )
    if (approvalError) {
      auditLog('mission_execution_blocked', {
        missionId: parsedBody.plan.missionId,
        reason: approvalError,
      })
      return json(403, { error: approvalError })
    }

    auditLog('mission_execution_started', {
      missionId: parsedBody.plan.missionId,
      issues: parsedBody.plan.gitlabIssues.length,
    })
    const execution = await executeGitLabMission(parsedBody.plan)
    auditLog('mission_execution_completed', {
      missionId: parsedBody.plan.missionId,
      mode: execution.mode,
      failedActions: execution.actions.filter((action) => action.status === 'failed')
        .length,
      totalActions: execution.actions.length,
    })
    return json(200, { execution })
  }

  return json(404, { error: 'Not found' })
}

function normalizePath(path: string): string {
  const withoutFunctionPrefix = path.replace(/^\/\.netlify\/functions\/api/, '')
  const withoutApiPrefix = withoutFunctionPrefix.replace(/^\/api/, '')
  return withoutApiPrefix || '/'
}

function parseBody(body: string | null): unknown {
  if (!body) return {}
  try {
    return JSON.parse(body)
  } catch {
    return {}
  }
}

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}
