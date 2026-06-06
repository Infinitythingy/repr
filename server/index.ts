import express, { type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MissionPlan } from '../src/shared/mission'
import { executeGitLabMission } from './gitlabMcp'
import { createMissionPlan, missionRequestSchema } from './missionAgent'

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
  response.json({ plan })
})

app.post('/api/mission/execute', async (request: Request, response: Response) => {
  const plan = request.body?.plan as MissionPlan | undefined
  if (!plan?.missionId || !Array.isArray(plan.gitlabIssues)) {
    response.status(400).json({ error: 'Mission plan is required' })
    return
  }

  const execution = await executeGitLabMission(plan)
  response.json({ execution })
})

if (process.env.NODE_ENV === 'production' && existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/.*/, (_request: Request, response: Response) => {
    response.sendFile(join(distDir, 'index.html'))
  })
}

if (!process.env.VITEST) {
  const port = Number(process.env.PORT ?? 8787)
  app.listen(port, () => {
    console.log(`MissionOps API listening on http://127.0.0.1:${port}`)
  })
}
