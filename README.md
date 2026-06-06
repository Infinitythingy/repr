# MissionOps Agent

MissionOps is a submit-ready Google Cloud Rapid Agent Hackathon project for the **GitLab** partner track. It turns a messy finance/operations goal into an approved execution plan, GitLab issue queue, audit controls, and report pack.

The app is intentionally more than chat: it plans a multi-step mission, waits for human approval, then executes through a GitLab MCP action layer. It runs locally in demo mode without private credentials and can switch to live Gemini + GitLab MCP mode through environment variables.

## Why This Track

GitLab is the strongest fit for this build because the requested agent generates workflows, tickets, and reports for finance/operations teams. GitLab MCP gives the agent a meaningful system of action: issues, labels, milestones, ownership, due dates, and execution history.

Current hackathon requirements emphasize a functional Gemini/Google Cloud agent, multi-step execution, partner MCP integration, hosted project URL, public repo with license, and a short demo video. GitLab's MCP docs describe secure access to projects, issues, merge requests, and other GitLab data for external AI tools.

Sources used while shaping the submission:

- Devpost hackathon page: https://rapid-agent.devpost.com
- Devpost resources page: https://rapid-agent.devpost.com/resources
- GitLab MCP docs: https://docs.gitlab.com/user/gitlab_duo/model_context_protocol
- Gemini 3 Developer Guide: https://ai.google.dev/gemini-api/docs/gemini-3

## What It Does

- Converts a finance/ops goal into a staged mission plan
- Drafts GitLab issues with owner, labels, due date, and evidence expectations
- Produces executive, audit, and operations report outlines
- Maps controls such as two-person approval, redaction, and aged exception escalation
- Requires explicit approval before the GitLab MCP execution step
- Runs in demo mode for judges without credentials
- Supports live Gemini and GitLab MCP mode when credentials are configured

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL printed by the terminal, usually `http://localhost:5173`.

## Environment

Copy `.env.example` to `.env` and fill only what you need.

```bash
cp .env.example .env
```

Demo mode works with no secrets.

For Gemini planning:

```bash
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-3-flash-preview
```

For live GitLab MCP execution, configure the command supplied by the hackathon partner resources or your chosen GitLab MCP server:

```bash
GITLAB_MCP_COMMAND=
GITLAB_MCP_ARGS=
GITLAB_TOKEN=
GITLAB_PROJECT_ID=
```

Leave `GITLAB_MCP_COMMAND` blank for simulated MCP mode.

## Test

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

The Playwright suite covers both desktop and mobile Chromium.

For a full local submission gate:

```bash
npm run verify:submission
```

## Submission Assets

- App source: this repository
- License: `LICENSE`
- Agent Builder manifest: `agent/agent-builder-manifest.json`
- Demo script: `docs/demo-script.md`
- Devpost copy: `docs/devpost-submission.md`
- Architecture: `docs/architecture.md`
- Requirement evidence map: `docs/rubric-map.md`
- Live GitLab MCP setup: `docs/live-gitlab-mcp.md`
- Final checklist: `docs/submission-checklist.md`

## Hosting

Cloud Run path:

```bash
gcloud run deploy missionops-agent \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

Add `GEMINI_API_KEY`, `GITLAB_MCP_COMMAND`, `GITLAB_MCP_ARGS`, `GITLAB_TOKEN`, and `GITLAB_PROJECT_ID` as Cloud Run environment variables when you are ready for live mode.

General path:

1. Push this repository to a public GitHub/GitLab repo.
2. Deploy the front end and API together on Cloud Run, Render, Railway, or another Node host.
3. Set the same environment variables on the host.
4. Paste the hosted app URL into Devpost.

For a static-only preview host, deploy the Vite build and keep the API on a Node/Cloud Run service, then set a reverse proxy for `/api`.

## Prize Demo Flow

1. Open MissionOps Agent.
2. Keep the default quarter-close mission or choose **Fraud surge**.
3. Click **Plan mission**.
4. Show the executive brief, staged plan, GitLab issue queue, controls, and report pack.
5. Click **Approve & sync**.
6. Show the GitLab MCP execution log.

## License

MIT
