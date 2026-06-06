# Submission Checklist

## Before Recording

- Run `npm run verify:submission`.
- Confirm the app opens and the generated command visual loads.
- Choose either demo mode or live GitLab MCP mode.
- If using live mode, use a sandbox GitLab project.
- Keep the default quarter-close mission unless the fraud preset fits your story better.

## Devpost Fields

- Project name: `MissionOps Agent`
- Track: `GitLab`
- Tagline: use `docs/devpost-submission.md`
- Description: use the "What It Does" and "How We Built It" sections
- Source code URL: public repository URL
- Hosted app URL: `https://missionops-agent.netlify.app`
- Source code URL: `https://github.com/Infinitythingy/repr`
- Demo video URL: `https://missionops-agent.netlify.app/missionops-demo.webm`
- License: MIT

## Required Artifacts

- Hosted project URL
- Public source repository
- Detectable open-source license at repository root
- About section license metadata if your host supports it
- Approximately 3-minute demo video
- Completed Devpost form

## Video Shot List

1. State the problem: finance operations needs action, not answers.
2. Show the operational goal, connected sources, urgency, and controls.
3. Click **Plan mission**.
4. Show the executive brief, timeline, issue queue, control matrix, and report pack.
5. Click **Approve & sync**.
6. Show the GitLab MCP execution trail.
7. Close with why GitLab is the system of action and why human approval matters.

## Final Smoke Test

```bash
npm run verify:submission
npm run test:e2e:hosted
```

Expected result:

- ESLint passes
- Vitest passes
- Production build passes
- Playwright desktop and mobile flows pass
- Hosted Playwright flow passes against Netlify
