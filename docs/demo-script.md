# MissionOps Demo Script

Target length: about 3 minutes.

## 0:00-0:20 - Problem

Finance and operations teams often run urgent workflows across spreadsheets, ERP exports, payment reports, and engineering tickets. The risky part is not just answering questions. It is turning the goal into accountable work with approvals, evidence, and reporting.

## 0:20-0:50 - Agent Setup

Show MissionOps Agent. Select the default quarter-close mission or the fraud surge preset. Point out the connected systems, urgency, and control constraints.

## 0:50-1:35 - Multi-Step Planning

Click **Plan mission**. The agent produces:

- an executive brief
- staged timeline
- GitLab issue queue
- control matrix
- report pack
- MCP action plan

Mention that with `GEMINI_API_KEY`, the planning path uses Gemini 3. Without credentials, the app runs a deterministic judge-friendly demo.

## 1:35-2:20 - Partner MCP Execution

Click **Approve & sync**. Explain that the GitLab MCP adapter discovers tools and creates color-coded labels, Day 1/Day 2 milestones, and issues in live mode. In demo mode it records the same action trail without writing to an external project.

For the strongest sponsor proof, record this segment from a local run configured with a sandbox GitLab project. After the approval click, cut to the GitLab repository and show the newly created issues, label colors, and milestones.

## 2:20-2:50 - Why It Wins

MissionOps goes beyond chat by planning, waiting for human approval, and executing through a partner MCP server. It is aimed at finance operations where accountability, audit evidence, and handoffs matter.

## 2:50-3:00 - Close

Show the README setup and submission checklist. End on the GitLab MCP execution log.
