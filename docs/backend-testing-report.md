# Technical Backend Testing Report

Date: June 6, 2026

This report maps the requested backend checklist to the current MissionOps repository and hosted deployment.

## Summary

Automated local checks passed:

```bash
npm run check
npm run test:e2e
```

Additional hosted and manual checks run during this audit:

```bash
npm run audit:secrets
gh repo view Infinitythingy/repr --json nameWithOwner,isPrivate,url,licenseInfo
curl https://missionops-agent.netlify.app/api/health
```

## 1. MCP Handshake Live Test

Status: **Externally blocked**

The code path exists in `server/gitlabMcp.ts` and uses `@modelcontextprotocol/sdk` over stdio. The backend discovers tools, selects label/milestone/issue creation tools, shapes arguments from input schemas, and catches live MCP errors cleanly.

What was verified here:

- Simulated MCP execution passes through the full UI.
- Invalid live MCP command returns a readable failed action instead of crashing.
- MCP execution is now timeout-protected through `GITLAB_MCP_TIMEOUT_MS`.

What still requires your real account:

- Configure `GITLAB_MCP_COMMAND`, `GITLAB_MCP_ARGS`, `GITLAB_TOKEN`, and `GITLAB_PROJECT_ID`.
- Run against a sandbox GitLab project.
- Confirm real labels, milestones, and issues were created in GitLab.

## 2. Grounding Data Anomalies Test

Status: **Passed locally**

Evidence:

- `server/grounding.ts`
- `tests/missionAgent.test.ts`

Corrupted GL data with a large negative revenue row and malformed row is flagged. The plan does not crash or ignore the data; it adds anomaly details, raises risk, and adds a grounding control.

## 3. No-Approval Block

Status: **Passed locally**

Evidence:

- `server/approval.ts`
- `/api/mission/execute` in `server/index.ts`
- Netlify function equivalent in `netlify/functions/api.ts`
- `tests/missionAgent.test.ts`

Direct POST to execute without an explicit approval payload now returns `403`. The frontend sends:

```json
{
  "confirmed": true,
  "approvalText": "APPROVE_SYNC"
}
```

## 4. API Error Handling & Timeout Recovery

Status: **Passed locally for invalid MCP config**

Evidence:

- `server/gitlabMcp.ts`
- `tests/missionAgent.test.ts`

Invalid MCP command returns a structured failed action with a readable message. Raw stack traces are not returned to the UI.

## 5. Risk Score Determinism Check

Status: **Passed locally for deterministic mode**

Evidence:

- `tests/missionAgent.test.ts`
- Gemini temperature lowered to `0.1` in `server/providers/gemini.ts`

The same request with the same corrupted grounding file returns the same deterministic risk score across repeated runs when no Gemini key is configured.

Gemini live determinism still requires a real `GEMINI_API_KEY` and should be checked after configuring credentials.

## 6. Clean Room Installation Test

Status: **Passed**

The repo was cloned into a fresh temporary directory from the public GitHub URL. These commands passed:

```bash
tmpdir=$(mktemp -d)
git clone https://github.com/Infinitythingy/repr "$tmpdir"
cd "$tmpdir"
npm ci
npm run check
npm run test:e2e
npm run audit:secrets
```

## 7. Secrets and Token Sweep

Status: **Passed locally**

Evidence:

```bash
npm run audit:secrets
```

No Google API keys, GitLab PATs, GitHub tokens, or private keys matched the audit pattern. Secret placeholders remain in `.env.example` only.

## 8. Devpost License Scan

Status: **Passed**

Evidence:

```bash
gh repo view Infinitythingy/repr --json nameWithOwner,isPrivate,url,licenseInfo
```

GitHub reports:

- `isPrivate: false`
- `licenseInfo.key: mit`

## 9. Log Verification Tracking

Status: **Passed locally**

Evidence:

- `server/auditLog.ts`
- Calls in `server/index.ts`
- Calls in `netlify/functions/api.ts`

Plan creation, execution start, execution block, and execution completion emit structured JSON logs with mission ID, mode, issue count, failed action count, and anomaly count.

## 10. Payload Truncation

Status: **Passed locally**

Evidence:

- `server/grounding.ts`
- `tests/missionAgent.test.ts`

Massive ledger input is summarized to a fixed maximum row budget before planning. The plan records total rows, processed rows, truncated rows, and a truncation anomaly instead of silently cutting off compliance information.
