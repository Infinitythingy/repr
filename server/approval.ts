import { z } from 'zod'
import type { MissionPlan } from '../src/shared/mission'

export const executionApprovalSchema = z.object({
  missionId: z.string().min(4),
  confirmed: z.literal(true),
  approvedBy: z.string().trim().min(2).max(80),
  approvedAt: z.string().datetime(),
  approvalText: z.literal('APPROVE_SYNC'),
})

const MAX_APPROVAL_AGE_MS = 60 * 60 * 1000

export function validateExecutionApproval(
  plan: MissionPlan,
  approval: unknown,
): string | null {
  const parsed = executionApprovalSchema.safeParse(approval)
  if (!parsed.success) {
    return 'Human approval confirmation is required before GitLab MCP execution.'
  }
  if (parsed.data.missionId !== plan.missionId) {
    return 'Approval mission ID does not match the plan being executed.'
  }

  const approvedAt = Date.parse(parsed.data.approvedAt)
  if (!Number.isFinite(approvedAt)) {
    return 'Approval timestamp is invalid.'
  }

  const age = Math.abs(Date.now() - approvedAt)
  if (age > MAX_APPROVAL_AGE_MS) {
    return 'Approval is stale. Reconfirm before executing GitLab MCP actions.'
  }

  return null
}
