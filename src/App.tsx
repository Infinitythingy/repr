import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  FileText,
  GitBranch,
  GitPullRequest,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  TimerReset,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import './App.css'
import {
  defaultMissionRequest,
  missionPresets,
  type DataSource,
  type McpExecutionLog,
  type MissionPlan,
  type MissionRequest,
} from './shared/mission'

type ApiError = {
  error?: string
}

const dataSourceOptions: DataSource[] = [
  'ERP export',
  'Payments ledger',
  'GL spreadsheet',
  'Fraud queue',
  'Vendor register',
  'GitLab project',
]

function App() {
  const [request, setRequest] = useState<MissionRequest>(defaultMissionRequest)
  const [constraintText, setConstraintText] = useState(
    defaultMissionRequest.constraints.join('\n'),
  )
  const [plan, setPlan] = useState<MissionPlan | null>(null)
  const [execution, setExecution] = useState<McpExecutionLog | null>(null)
  const [isPlanning, setIsPlanning] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState('')

  const completedActions = useMemo(
    () => execution?.actions.filter((action) => action.status !== 'failed') ?? [],
    [execution],
  )

  const toggleDataSource = (source: DataSource) => {
    setRequest((current) => {
      const exists = current.dataSources.includes(source)
      return {
        ...current,
        dataSources: exists
          ? current.dataSources.filter((item) => item !== source)
          : [...current.dataSources, source],
      }
    })
  }

  const applyPreset = (presetId: string) => {
    const preset = missionPresets.find((item) => item.id === presetId)
    if (!preset) return
    setRequest(preset.request)
    setConstraintText(preset.request.constraints.join('\n'))
    setExecution(null)
    setPlan(null)
    setError('')
  }

  const planMission = async () => {
    setIsPlanning(true)
    setError('')
    setExecution(null)
    try {
      const payload: MissionRequest = {
        ...request,
        constraints: constraintText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      }

      const response = await fetch('/api/mission/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiError
        throw new Error(body.error ?? 'Mission planning failed')
      }
      const body = (await response.json()) as { plan: MissionPlan }
      setPlan(body.plan)
    } catch (planningError) {
      setError(
        planningError instanceof Error
          ? planningError.message
          : 'Mission planning failed',
      )
    } finally {
      setIsPlanning(false)
    }
  }

  const executeMission = async () => {
    if (!plan) return
    setIsExecuting(true)
    setError('')
    try {
      const response = await fetch('/api/mission/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiError
        throw new Error(body.error ?? 'GitLab MCP execution failed')
      }
      const body = (await response.json()) as { execution: McpExecutionLog }
      setExecution(body.execution)
    } catch (executionError) {
      setError(
        executionError instanceof Error
          ? executionError.message
          : 'GitLab MCP execution failed',
      )
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="control-panel" aria-label="Mission controls">
          <div className="brand-lockup">
            <span className="brand-mark">
              <GitBranch size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="eyebrow">GitLab Track</p>
              <h1>MissionOps Agent</h1>
            </div>
          </div>

          <div className="preset-row" aria-label="Mission presets">
            {missionPresets.map((preset) => (
              <button
                className="preset-button"
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="field">
            <span>Operational goal</span>
            <textarea
              value={request.goal}
              onChange={(event) =>
                setRequest((current) => ({
                  ...current,
                  goal: event.target.value,
                }))
              }
              rows={6}
            />
          </label>

          <label className="field">
            <span>Business context</span>
            <textarea
              value={request.context}
              onChange={(event) =>
                setRequest((current) => ({
                  ...current,
                  context: event.target.value,
                }))
              }
              rows={5}
            />
          </label>

          <div className="inline-controls">
            <label className="field compact">
              <span>Urgency</span>
              <select
                value={request.urgency}
                onChange={(event) =>
                  setRequest((current) => ({
                    ...current,
                    urgency: event.target.value as MissionRequest['urgency'],
                  }))
                }
              >
                <option value="standard">Standard</option>
                <option value="accelerated">Accelerated</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="field compact">
              <span>Approval</span>
              <select
                value={request.approvalMode}
                onChange={(event) =>
                  setRequest((current) => ({
                    ...current,
                    approvalMode: event.target
                      .value as MissionRequest['approvalMode'],
                  }))
                }
              >
                <option value="manual">Manual</option>
                <option value="two_person">Two person</option>
                <option value="auto_draft">Auto draft</option>
              </select>
            </label>
          </div>

          <div className="source-grid" aria-label="Connected systems">
            {dataSourceOptions.map((source) => (
              <button
                className={
                  request.dataSources.includes(source)
                    ? 'source-chip active'
                    : 'source-chip'
                }
                key={source}
                type="button"
                onClick={() => toggleDataSource(source)}
              >
                <CircleDot size={14} aria-hidden="true" />
                {source}
              </button>
            ))}
          </div>

          <label className="field">
            <span>Controls</span>
            <textarea
              value={constraintText}
              onChange={(event) => setConstraintText(event.target.value)}
              rows={4}
            />
          </label>

          <button
            className="primary-action"
            type="button"
            onClick={planMission}
            disabled={isPlanning}
          >
            {isPlanning ? (
              <Loader2 className="spin" size={18} aria-hidden="true" />
            ) : (
              <Sparkles size={18} aria-hidden="true" />
            )}
            Plan mission
          </button>

          {error ? <p className="error-banner">{error}</p> : null}
        </aside>

        <section className="mission-board" aria-label="Mission output">
          <header className="topbar">
            <div>
              <p className="eyebrow">Finance Operations</p>
              <h2>{plan?.title ?? 'Quarter-close command mission'}</h2>
            </div>
            <div className="status-strip" aria-label="Agent status">
              <span>
                <Activity size={15} aria-hidden="true" />
                {plan?.agentMode === 'gemini'
                  ? 'Gemini 3'
                  : 'Demo reasoning'}
              </span>
              <span>
                <GitPullRequest size={15} aria-hidden="true" />
                GitLab MCP
              </span>
              <span>
                <ShieldCheck size={15} aria-hidden="true" />
                Human approved
              </span>
            </div>
          </header>

          <section className="visual-band" aria-label="Command overview">
            <img
              src="/missionops-command.png"
              alt="Finance operations command displays with workflow lanes and risk signals"
            />
            <div className="metric-rail">
              <div>
                <span>{plan?.riskScore ?? 74}</span>
                <p>Risk index</p>
              </div>
              <div>
                <span>{plan?.timeSavedHours ?? 18}h</span>
                <p>Manual work saved</p>
              </div>
              <div>
                <span>{plan?.gitlabIssues.length ?? 6}</span>
                <p>Issue drafts</p>
              </div>
            </div>
          </section>

          <section className="output-grid">
            <article className="panel brief-panel">
              <div className="panel-heading">
                <BadgeCheck size={18} aria-hidden="true" />
                <h3>Executive Brief</h3>
              </div>
              <p>
                {plan?.executiveBrief ??
                  'Create an audit-ready operating lane for quarter-end close, assign owners, and sync each work item into GitLab for accountable execution.'}
              </p>
              <div className="brief-meta">
                <span>Confidence {Math.round((plan?.confidence ?? 0.86) * 100)}%</span>
                <span>{plan?.createdAt ? new Date(plan.createdAt).toLocaleString() : 'Ready'}</span>
              </div>
            </article>

            <article className="panel">
              <div className="panel-heading">
                <TimerReset size={18} aria-hidden="true" />
                <h3>Plan Timeline</h3>
              </div>
              <div className="stage-list">
                {(plan?.stages ?? []).map((stage, index) => (
                  <div className="stage-row" key={stage.id}>
                    <span className="stage-index">{index + 1}</span>
                    <div>
                      <h4>{stage.name}</h4>
                      <p>{stage.objective}</p>
                    </div>
                    <strong>{stage.window}</strong>
                  </div>
                ))}
                {!plan ? (
                  <div className="stage-empty">
                    <CircleDot size={18} aria-hidden="true" />
                    <span>Mission plan appears here after generation.</span>
                  </div>
                ) : null}
              </div>
            </article>

            <article className="panel issue-panel">
              <div className="panel-heading">
                <TicketCheck size={18} aria-hidden="true" />
                <h3>GitLab Issue Queue</h3>
              </div>
              <div className="issue-list">
                {(plan?.gitlabIssues ?? []).map((issue) => (
                  <div className="issue-row" key={issue.title}>
                    <div>
                      <h4>{issue.title}</h4>
                      <p>{issue.description}</p>
                      <div className="tag-row">
                        {issue.labels.map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                    </div>
                    <strong>{issue.owner}</strong>
                  </div>
                ))}
                {!plan ? (
                  <div className="stage-empty">
                    <TicketCheck size={18} aria-hidden="true" />
                    <span>Draft tickets are created from the approved plan.</span>
                  </div>
                ) : null}
              </div>
            </article>

            <article className="panel">
              <div className="panel-heading">
                <ClipboardCheck size={18} aria-hidden="true" />
                <h3>Control Matrix</h3>
              </div>
              <div className="control-list">
                {(plan?.controls ?? []).map((control) => (
                  <div className="control-row" key={control.name}>
                    <CheckCircle2 size={17} aria-hidden="true" />
                    <div>
                      <h4>{control.name}</h4>
                      <p>{control.evidence}</p>
                    </div>
                    <strong>{control.owner}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-heading">
                <FileText size={18} aria-hidden="true" />
                <h3>Report Pack</h3>
              </div>
              <div className="report-stack">
                {(plan?.reports ?? []).map((report) => (
                  <div className="report-row" key={report.title}>
                    <span>{report.format}</span>
                    <div>
                      <h4>{report.title}</h4>
                      <p>{report.audience}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel execution-panel">
              <div className="panel-heading">
                <GitBranch size={18} aria-hidden="true" />
                <h3>GitLab MCP Execution</h3>
              </div>
              <div className="execution-actions">
                <button
                  className="secondary-action"
                  type="button"
                  onClick={executeMission}
                  disabled={!plan || isExecuting}
                >
                  {isExecuting ? (
                    <Loader2 className="spin" size={18} aria-hidden="true" />
                  ) : (
                    <Play size={18} aria-hidden="true" />
                  )}
                  Approve & sync
                </button>
                <button
                  className="ghost-action"
                  type="button"
                  onClick={() => {
                    setPlan(null)
                    setExecution(null)
                    setError('')
                  }}
                >
                  <RefreshCw size={17} aria-hidden="true" />
                </button>
              </div>
              <div className="execution-list">
                {(execution?.actions ?? []).map((action) => (
                  <div className="execution-row" key={action.id}>
                    <span
                      className={
                        action.status === 'failed'
                          ? 'action-dot failed'
                          : 'action-dot'
                      }
                    />
                    <div>
                      <h4>{action.title}</h4>
                      <p>{action.detail}</p>
                    </div>
                  </div>
                ))}
                {!execution ? (
                  <div className="stage-empty">
                    <ArrowRight size={18} aria-hidden="true" />
                    <span>
                      {plan
                        ? 'Approve the plan to sync GitLab work items.'
                        : 'Generate a plan before execution.'}
                    </span>
                  </div>
                ) : null}
              </div>
              {execution ? (
                <footer className="execution-footer">
                  <span>{execution.mode}</span>
                  <span>{completedActions.length} actions recorded</span>
                </footer>
              ) : null}
            </article>
          </section>
        </section>
      </section>
    </main>
  )
}

export default App
