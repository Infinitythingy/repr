# Live GitLab MCP Setup

MissionOps runs in demo mode by default. Live mode starts a GitLab MCP server over stdio and uses the Model Context Protocol SDK to discover and call tools.

## Environment Variables

```bash
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3-flash-preview

GITLAB_MCP_COMMAND=your_mcp_command
GITLAB_MCP_ARGS="optional args"
GITLAB_TOKEN=your_gitlab_token
GITLAB_PROJECT_ID=your_project_id
```

Do not set `MISSIONOPS_MCP_MODE=demo` when testing live writes.

## Token Scope

Use the least-privileged token that can create issues, labels, milestones, and comments in the target project. For a judging demo, create a dedicated sandbox GitLab project and token.

## How The Adapter Works

1. Starts the configured MCP server with `StdioClientTransport`.
2. Calls `listTools`.
3. Selects tools whose names/descriptions indicate issue, label, or milestone creation.
4. Shapes arguments from the exposed input schema where possible.
5. Creates work items only after the user clicks **Approve & sync**.

## Safe Demo Strategy

Use demo mode in the video if credentials are unavailable. Narrate that the same action list becomes live writes when `GITLAB_MCP_COMMAND` and project credentials are configured.

For the strongest live sponsor demo:

1. Create a fresh GitLab project named `missionops-demo`.
2. Configure a token and MCP command.
3. Run `npm run dev`.
4. Plan the default mission.
5. Click **Approve & sync**.
6. Show the created issues and labels in GitLab.
