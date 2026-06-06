# Requirement Evidence Map

Use this page while filling Devpost or answering judge questions.

## Functional Agent

Evidence:

- `src/App.tsx` provides the working mission planning and approval UI.
- `server/index.ts` exposes `/api/mission/plan` and `/api/mission/execute`.
- `tests/e2e/missionops.spec.ts` verifies the full browser flow.

Demo line:

MissionOps turns an ambiguous finance operations goal into a structured plan, then executes an approved GitLab MCP action trail.

## Beyond Chat

Evidence:

- `server/missionAgent.ts` creates staged work, GitLab issue drafts, controls, reports, and MCP actions.
- `server/gitlabMcp.ts` executes or simulates MCP actions after approval.
- The UI requires **Approve & sync** before external execution.

Demo line:

The agent does not stop at a response. It creates accountable work items, owners, due dates, and report handoffs.

## Multi-Step Mission

Evidence:

- `MissionPlan.stages` in `src/shared/mission.ts`
- Stage generation in `server/missionAgent.ts`
- Timeline rendering in `src/App.tsx`

Demo line:

The mission is decomposed into framing, evidence mapping, GitLab sync, exception resolution, and reporting.

## Partner MCP Integration

Evidence:

- `server/gitlabMcp.ts` uses `@modelcontextprotocol/sdk` and `StdioClientTransport`.
- `.env.example` documents `GITLAB_MCP_COMMAND`, `GITLAB_MCP_ARGS`, `GITLAB_TOKEN`, and `GITLAB_PROJECT_ID`.
- `docs/live-gitlab-mcp.md` explains live setup.

Demo line:

GitLab is the execution system of record: labels, milestones, issues, ownership, due dates, and audit trail.

## Gemini / Google Cloud

Evidence:

- `server/providers/gemini.ts` calls the Gemini generateContent API.
- `.env.example` defaults to `gemini-3-flash-preview`.
- `agent/agent-builder-manifest.json` documents the Agent Builder instructions and tool model.
- `Dockerfile` and README Cloud Run command support Google Cloud deployment.

Demo line:

Gemini performs planning when credentials are present; deterministic demo mode keeps the judge experience runnable without secrets.

## Human Oversight

Evidence:

- The execution button is disabled until a plan exists.
- No MCP writes happen before **Approve & sync**.
- Mission plans include approval mode and control matrix.

Demo line:

The agent is autonomous where it should be, but controlled where finance and audit risk demand review.

## Open Source Submission

Evidence:

- `LICENSE` contains MIT license text.
- `package.json` includes `"license": "MIT"`.
- `README.md` provides install, test, host, and demo instructions.

## Verification

Evidence:

- `npm run check`
- `npm run test:e2e`
- `.github/workflows/ci.yml`

Demo line:

The repo includes unit tests, production build verification, and Playwright coverage across desktop and mobile Chromium.
