import { z } from 'zod'
import type {
  GroundingAnomaly,
  GroundingDataFile,
  GroundingSummary,
} from '../src/shared/mission'

export const groundingDataSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(['GL spreadsheet', 'ERP export', 'Payments ledger', 'CSV']),
  content: z.string().max(160_000),
})

const MAX_ROWS_PER_FILE = 250
const MAX_ANOMALIES = 12

export function analyzeGroundingData(
  files: GroundingDataFile[] | undefined,
): GroundingSummary {
  const summary: GroundingSummary = {
    filesAnalyzed: files?.length ?? 0,
    totalRows: 0,
    processedRows: 0,
    truncatedRows: 0,
    anomalies: [],
  }

  for (const file of files ?? []) {
    const rows = file.content
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean)

    summary.totalRows += rows.length
    const processedRows = rows.slice(0, MAX_ROWS_PER_FILE)
    summary.processedRows += processedRows.length
    summary.truncatedRows += Math.max(0, rows.length - processedRows.length)

    if (rows.length > MAX_ROWS_PER_FILE) {
      addAnomaly(summary, {
        id: `${file.name}-truncated`,
        severity: 'Medium',
        source: file.name,
        message: `${rows.length - MAX_ROWS_PER_FILE} rows were summarized before Gemini prompting to avoid token truncation.`,
      })
    }

    const expectedColumns = inferExpectedColumns(processedRows)
    processedRows.forEach((row, index) => {
      const rowNumber = index + 1
      const columns = splitLooseRow(row)
      if (expectedColumns > 0 && columns.length < Math.max(2, expectedColumns - 2)) {
        addAnomaly(summary, {
          id: `${file.name}-format-${rowNumber}`,
          severity: 'Medium',
          source: file.name,
          rowNumber,
          message: 'Row formatting is inconsistent with the surrounding ledger export.',
        })
      }

      const values = extractNumbers(row)
      const lower = row.toLowerCase()
      for (const value of values) {
        if (lower.includes('revenue') && value < -100_000) {
          addAnomaly(summary, {
            id: `${file.name}-negative-revenue-${rowNumber}`,
            severity: 'High',
            source: file.name,
            rowNumber,
            message: `Large negative revenue value detected (${value.toLocaleString('en-US')}).`,
          })
        }
        if (Math.abs(value) >= 1_000_000 && /revenue|cash|payment|receivable|gl/.test(lower)) {
          addAnomaly(summary, {
            id: `${file.name}-material-value-${rowNumber}`,
            severity: value < 0 ? 'High' : 'Medium',
            source: file.name,
            rowNumber,
            message: `Material ledger value detected (${value.toLocaleString('en-US')}) for review.`,
          })
        }
      }
    })
  }

  return summary
}

export function groundingRiskAdjustment(summary: GroundingSummary): number {
  return summary.anomalies.reduce((score, anomaly) => {
    if (anomaly.severity === 'High') return score + 12
    if (anomaly.severity === 'Medium') return score + 6
    return score + 2
  }, summary.truncatedRows > 0 ? 4 : 0)
}

export function groundingPromptDigest(summary: GroundingSummary): string {
  if (summary.filesAnalyzed === 0) return 'No grounding files were supplied.'
  return [
    `${summary.filesAnalyzed} grounding files analyzed.`,
    `${summary.processedRows}/${summary.totalRows} rows processed.`,
    `${summary.truncatedRows} rows summarized to stay under model context limits.`,
    ...summary.anomalies.map(
      (anomaly) =>
        `${anomaly.severity} anomaly in ${anomaly.source}${anomaly.rowNumber ? ` row ${anomaly.rowNumber}` : ''}: ${anomaly.message}`,
    ),
  ].join('\n')
}

function addAnomaly(summary: GroundingSummary, anomaly: GroundingAnomaly) {
  if (summary.anomalies.some((item) => item.id === anomaly.id)) return
  if (summary.anomalies.length >= MAX_ANOMALIES) return
  summary.anomalies.push(anomaly)
}

function inferExpectedColumns(rows: string[]): number {
  const counts = rows.slice(0, 12).map((row) => splitLooseRow(row).length)
  if (counts.length === 0) return 0
  return Math.max(...counts)
}

function splitLooseRow(row: string): string[] {
  return row.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)|\|/).map((value) => value.trim())
}

function extractNumbers(row: string): number[] {
  const matches = row.match(/\(?-?\$?\d[\d,]*(?:\.\d+)?\)?/g) ?? []
  return matches
    .map((match) => {
      const negative = match.startsWith('(') && match.endsWith(')')
      const value = Number(match.replace(/[,$()]/g, ''))
      return negative ? -value : value
    })
    .filter((value) => Number.isFinite(value))
}
