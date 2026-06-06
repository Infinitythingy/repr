import type { Handler } from '@netlify/functions'
import type { MissionPlan } from '../../src/shared/mission'
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
    return json(200, { plan })
  }

  if (event.httpMethod === 'POST' && path === '/mission/execute') {
    const parsedBody = parseBody(event.body) as { plan?: MissionPlan }
    if (!parsedBody.plan?.missionId || !Array.isArray(parsedBody.plan.gitlabIssues)) {
      return json(400, { error: 'Mission plan is required' })
    }

    const execution = await executeGitLabMission(parsedBody.plan)
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
