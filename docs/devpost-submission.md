# Devpost Submission Copy

## Project Name

MissionOps Agent

## Tagline

Gemini-powered finance operations agent that turns messy business missions into approved GitLab execution plans.

## Track

GitLab

## Inspiration

Finance and operations teams rarely fail because no one can summarize the problem. They fail because urgent goals become scattered work: spreadsheet comments, Slack asks, unsupported data fixes, and audit evidence collected after the fact. MissionOps was built to turn that chaos into a controlled execution lane.

## What It Does

MissionOps takes an operational goal, business context, urgency, connected systems, and control constraints. It produces a staged mission plan, GitLab issue drafts, owner assignments, control checks, and executive/audit report packs. After human approval, it uses the GitLab MCP action layer to create the execution trail.

## How We Built It

- React + TypeScript dashboard
- Express TypeScript agent API
- Gemini 3 planning path through the Gemini API
- GitLab MCP adapter with live stdio MCP support
- Deterministic demo mode for judges without credentials
- Playwright and Vitest verification

## Partner Integration

MissionOps uses GitLab as the system of action. The agent maps mission plans into GitLab labels, milestones, issues, owners, due dates, and report handoffs through the GitLab MCP adapter. The integration is meaningful because GitLab becomes the accountable execution and audit trail, not just a display surface.

## Google Cloud / Gemini

The planning API is designed for Gemini 3 (`gemini-3-flash-preview` by default) and can be deployed as a custom agent runtime beside Google Cloud Agent Builder or Cloud Run. The included `agent/agent-builder-manifest.json` documents the Agent Builder configuration, instructions, tools, and safety controls.

## Accomplishments

- Built a complete run-ready app rather than a slide prototype
- Preserved human approval before external writes
- Made the demo runnable without private credentials
- Added a live MCP execution path for real GitLab projects
- Added a submission-ready README, demo script, and test suite

## What Is Next

- Add GitLab merge request handoffs for engineering-owned data fixes
- Add scheduled digest delivery
- Add richer evidence attachment workflows
- Deploy the API to Cloud Run and front end to the chosen hosted project URL
