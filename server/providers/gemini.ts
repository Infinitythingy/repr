import type { MissionPlan, MissionRequest } from '../../src/shared/mission'

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

export async function generatePlanWithGemini(
  input: MissionRequest,
): Promise<Partial<MissionPlan> | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const model = process.env.GEMINI_MODEL ?? 'gemini-3-flash-preview'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildMissionPrompt(input) }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.25,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`)
  }

  const body = (await response.json()) as GeminiGenerateResponse
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return null

  return JSON.parse(text) as Partial<MissionPlan>
}

function buildMissionPrompt(input: MissionRequest): string {
  return `
You are MissionOps Agent, a finance operations execution agent built for the Google Cloud Rapid Agent Hackathon.

Create a JSON-only mission plan for a web app. The plan must go beyond chat: it should turn the user's goal into GitLab MCP actions, issue drafts, report drafts, control checks, and a staged execution timeline.

User goal:
${input.goal}

Business context:
${input.context}

Urgency: ${input.urgency}
Approval mode: ${input.approvalMode}
Data sources: ${input.dataSources.join(', ')}
Constraints:
${input.constraints.map((constraint) => `- ${constraint}`).join('\n')}

Return only JSON matching this TypeScript shape:
{
  "title": string,
  "executiveBrief": string,
  "riskScore": number between 1 and 100,
  "confidence": number between 0 and 1,
  "timeSavedHours": number,
  "stages": [{"id": string, "name": string, "objective": string, "window": string, "owner": string, "exitCriteria": string}],
  "gitlabIssues": [{"title": string, "description": string, "owner": string, "labels": string[], "dueDate": "YYYY-MM-DD"}],
  "reports": [{"title": string, "audience": string, "format": "Exec memo" | "Audit pack" | "Ops digest", "sections": string[]}],
  "controls": [{"name": string, "owner": string, "evidence": string, "risk": "Low" | "Medium" | "High"}],
  "mcpActions": [{"tool": string, "target": string, "payloadSummary": string}],
  "agentTrace": string[]
}
Make it prize-demo quality, specific, finance-safe, and GitLab-native.
`
}
