type AuditFields = Record<string, string | number | boolean | undefined>

export function auditLog(event: string, fields: AuditFields = {}) {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      component: 'missionops-agent',
      event,
      ...fields,
    }),
  )
}
