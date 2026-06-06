# Architecture

MissionOps has two paths so judges can evaluate it immediately while sponsors can see the real integration shape.

## Local Demo Path

1. The React dashboard sends a mission request to `/api/mission/plan`.
2. The Express agent validates the request with Zod.
3. If no Gemini key is present, the deterministic planner returns a structured mission plan.
4. The user approves execution.
5. `/api/mission/execute` returns a simulated GitLab MCP action trail.

This mode performs no external writes.

## Live Path

1. Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL`.
2. Set `GITLAB_MCP_COMMAND`, `GITLAB_MCP_ARGS`, `GITLAB_TOKEN`, and `GITLAB_PROJECT_ID`.
3. The planner calls Gemini for structured reasoning.
4. The GitLab MCP adapter starts the configured MCP server over stdio.
5. The adapter lists available tools, selects issue/label/milestone tools, and creates work items after approval.

## Safety

- No external write occurs before the user clicks **Approve & sync**.
- Demo mode is the default when no MCP command is configured.
- Every issue includes owner, due date, labels, and evidence expectations.
- Control checks are explicit in the plan and report pack.
