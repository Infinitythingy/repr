import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { app } from '../server/index'
import { createMissionPlan } from '../server/missionAgent'
import { defaultMissionRequest, type MissionPlan } from '../src/shared/mission'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

function approvalFor(plan: MissionPlan) {
  return {
    missionId: plan.missionId,
    confirmed: true,
    approvedBy: 'MissionOps test operator',
    approvedAt: new Date().toISOString(),
    approvalText: 'APPROVE_SYNC',
  }
}

describe('MissionOps API', () => {
  it('creates an agentic mission plan with GitLab issue drafts', async () => {
    const response = await request(app)
      .post('/api/mission/plan')
      .send(defaultMissionRequest)
      .expect(200)

    expect(response.body.plan.title).toContain('Coordinate')
    expect(response.body.plan.stages.length).toBeGreaterThanOrEqual(5)
    expect(response.body.plan.gitlabIssues.length).toBeGreaterThanOrEqual(5)
    expect(
      response.body.plan.mcpActions.some(
        (action: { tool: string }) => action.tool === 'create_issue',
      ),
    ).toBe(true)
  })

  it('blocks direct GitLab MCP execution without human approval', async () => {
    const planResponse = await request(app)
      .post('/api/mission/plan')
      .send(defaultMissionRequest)
      .expect(200)

    await request(app)
      .post('/api/mission/execute')
      .send({ plan: planResponse.body.plan })
      .expect(403)
  })

  it('executes the plan in simulated MCP mode with explicit approval', async () => {
    const planResponse = await request(app)
      .post('/api/mission/plan')
      .send(defaultMissionRequest)
      .expect(200)

    const plan = planResponse.body.plan as MissionPlan
    const executionResponse = await request(app)
      .post('/api/mission/execute')
      .send({ plan, approval: approvalFor(plan) })
      .expect(200)

    expect(executionResponse.body.execution.mode).toBe('Simulated MCP')
    expect(executionResponse.body.execution.actions.length).toBeGreaterThan(5)
  })

  it('flags corrupted grounding rows instead of crashing or ignoring dirty data', async () => {
    const response = await request(app)
      .post('/api/mission/plan')
      .send({
        ...defaultMissionRequest,
        groundingData: [
          {
            name: 'corrupted-gl.csv',
            kind: 'GL spreadsheet',
            content:
              'account,type,amount\n4000,revenue,25000\n4001,revenue,-1000000\nBROKEN ROW\n1000,cash,1250000',
          },
        ],
      })
      .expect(200)

    const plan = response.body.plan as MissionPlan
    expect(plan.groundingSummary.anomalies.length).toBeGreaterThanOrEqual(2)
    expect(plan.groundingSummary.anomalies.some((item) => item.severity === 'High')).toBe(
      true,
    )
    expect(plan.riskScore).toBeGreaterThan(defaultMissionRequest.urgency === 'accelerated' ? 76 : 0)
  })

  it('summarizes massive grounding files before model prompting', async () => {
    const rows = Array.from(
      { length: 420 },
      (_item, index) => `400${index},revenue,${index + 1}`,
    ).join('\n')

    const response = await request(app)
      .post('/api/mission/plan')
      .send({
        ...defaultMissionRequest,
        groundingData: [
          {
            name: 'large-ledger.csv',
            kind: 'GL spreadsheet',
            content: `account,type,amount\n${rows}`,
          },
        ],
      })
      .expect(200)

    const plan = response.body.plan as MissionPlan
    expect(plan.groundingSummary.totalRows).toBeGreaterThan(250)
    expect(plan.groundingSummary.processedRows).toBe(250)
    expect(plan.groundingSummary.truncatedRows).toBeGreaterThan(0)
  })

  it('keeps deterministic risk scores stable for identical inputs', async () => {
    delete process.env.GEMINI_API_KEY
    const requestPayload = {
      ...defaultMissionRequest,
      groundingData: [
        {
          name: 'stable-gl.csv',
          kind: 'GL spreadsheet' as const,
          content: 'account,type,amount\n4001,revenue,-1000000',
        },
      ],
    }

    const plans = await Promise.all([
      createMissionPlan(requestPayload),
      createMissionPlan(requestPayload),
      createMissionPlan(requestPayload),
    ])

    expect(new Set(plans.map((plan) => plan.riskScore)).size).toBe(1)
  })

  it('returns readable MCP errors for invalid live configuration', async () => {
    process.env.GITLAB_MCP_COMMAND = '/definitely/missing/gitlab-mcp'
    delete process.env.MISSIONOPS_MCP_MODE

    const planResponse = await request(app)
      .post('/api/mission/plan')
      .send(defaultMissionRequest)
      .expect(200)
    const plan = planResponse.body.plan as MissionPlan

    const executionResponse = await request(app)
      .post('/api/mission/execute')
      .send({ plan, approval: approvalFor(plan) })
      .expect(200)

    const firstAction = executionResponse.body.execution.actions[0]
    expect(executionResponse.body.execution.mode).toBe('Live GitLab MCP')
    expect(firstAction.status).toBe('failed')
    expect(firstAction.detail).not.toContain('\n    at ')
  })
})
