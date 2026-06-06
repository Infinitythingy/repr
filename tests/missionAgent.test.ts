import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../server/index'
import { defaultMissionRequest } from '../src/shared/mission'

describe('MissionOps API', () => {
  it('creates an agentic mission plan with GitLab issue drafts', async () => {
    const response = await request(app)
      .post('/api/mission/plan')
      .send(defaultMissionRequest)
      .expect(200)

    expect(response.body.plan.title).toContain('Coordinate')
    expect(response.body.plan.stages.length).toBeGreaterThanOrEqual(5)
    expect(response.body.plan.gitlabIssues.length).toBeGreaterThanOrEqual(5)
    expect(response.body.plan.mcpActions.some((action: { tool: string }) => action.tool === 'create_issue')).toBe(true)
  })

  it('executes the plan in simulated MCP mode without credentials', async () => {
    const planResponse = await request(app)
      .post('/api/mission/plan')
      .send(defaultMissionRequest)
      .expect(200)

    const executionResponse = await request(app)
      .post('/api/mission/execute')
      .send({ plan: planResponse.body.plan })
      .expect(200)

    expect(executionResponse.body.execution.mode).toBe('Simulated MCP')
    expect(executionResponse.body.execution.actions.length).toBeGreaterThan(5)
  })
})
