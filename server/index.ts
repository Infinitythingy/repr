import express, { type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MissionPlan } from '../src/shared/mission'
import { auditLog } from './auditLog'
import { executeGitLabMission } from './gitlabMcp'
import { createMissionPlan, missionRequestSchema } from './missionAgent'
import { validateExecutionApproval } from './approval'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')

export const app = express()

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request: Request, response: Response) => {
  response.json({
    ok: true,
    service: 'missionops-agent',
    mcpMode: process.env.GITLAB_MCP_COMMAND ? 'live-capable' : 'demo',
  })
})

app.post('/api/mission/plan', async (request: Request, response: Response) => {
  const parsed = missionRequestSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({
      error: parsed.error.issues.at(0)?.message ?? 'Invalid mission request',
    })
    return
  }

  const plan = await createMissionPlan(parsed.data)
  auditLog('mission_plan_created', {
    missionId: plan.missionId,
    mode: plan.agentMode,
    riskScore: plan.riskScore,
    issues: plan.gitlabIssues.length,
    anomalies: plan.groundingSummary.anomalies.length,
  })
  response.json({ plan })
})

app.post('/api/mission/execute', async (request: Request, response: Response) => {
  const plan = request.body?.plan as MissionPlan | undefined
  if (!plan?.missionId || !Array.isArray(plan.gitlabIssues)) {
    response.status(400).json({ error: 'Mission plan is required' })
    return
  }

  const approvalError = validateExecutionApproval(plan, request.body?.approval)
  if (approvalError) {
    auditLog('mission_execution_blocked', {
      missionId: plan.missionId,
      reason: approvalError,
    })
    response.status(403).json({ error: approvalError })
    return
  }

  auditLog('mission_execution_started', {
    missionId: plan.missionId,
    issues: plan.gitlabIssues.length,
  })
  const execution = await executeGitLabMission(plan)
  auditLog('mission_execution_completed', {
    missionId: plan.missionId,
    mode: execution.mode,
    failedActions: execution.actions.filter((action) => action.status === 'failed')
      .length,
    totalActions: execution.actions.length,
  })
  response.json({ execution })
})

if (process.env.NODE_ENV === 'production' && existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/.*/, (_request: Request, response: Response) => {
    response.sendFile(join(distDir, 'index.html'))
  })
}

const isDirectRun =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1]

if (isDirectRun) {
  const port = Number(process.env.PORT ?? 8787)
  app.listen(port, () => {
    console.log(`MissionOps API listening on http://127.0.0.1:${port}`)
  })
}
