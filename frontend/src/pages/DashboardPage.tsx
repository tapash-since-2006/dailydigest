import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts'
import { format, parseISO } from 'date-fns'
import { CheckCircle2, XCircle, Activity, Zap, TrendingUp, DollarSign } from 'lucide-react'
import { getProviderStats, listDigests, getProviderLogsByDate, getCostStats } from '../lib/api'
import { ProviderStat, DigestSummary, ProviderLog, CostData } from '../types'
import { Spinner, StatCard, ErrorBanner, ProviderBadge, LevelBadge, SectionHeader } from '../components/UI'

const COLORS = ['#C2410C','#1D4ED8','#0A7B3E','#7C3AED','#B45309','#0E7490','#9D174D']

const tooltipStyle = {
  contentStyle: {
    background: 'var(--card)', border: '1px solid var(--rule)',
    borderRadius: '2px', fontSize: '12px', color: 'var(--ink)',
    boxShadow: 'var(--shadow-md)'
  },
  itemStyle: { color: 'var(--ink-2)' },
  labelStyle: { color: 'var(--ink-4)', fontSize: '11px' },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<ProviderStat[]>([])
  const [digests, setDigests] = useState<DigestSummary[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [logs, setLogs] = useState<ProviderLog[]>([])
  const [costData, setCostData] = useState<CostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'costs'>('overview')

  useEffect(() => {
    Promise.all([getProviderStats(), listDigests(30), getCostStats()])
      .then(([s, d, c]) => {
        setStats(s); setDigests(d); setCostData(c)
        if (d.length > 0) setSelectedDate(d[0].date?.slice(0, 10))
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    setLogsLoading(true)
    getProviderLogsByDate(selectedDate).then(setLogs).catch(() => setLogs([])).finally(() => setLogsLoading(false))
  }, [selectedDate])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Spinner size={24} /></div>

  const totalRuns = digests.length
  const successRate = stats.length ? Math.round(stats.reduce((a, s) => a + (parseInt(s.successes) / parseInt(s.total)) * 100, 0) / stats.length) : 0
  const avgLatency = (() => {
    const ok = stats.filter(s => parseInt(s.successes) > 0)
    return ok.length ? Math.round(ok.reduce((a, s) => a + s.avg_latency_ms, 0) / ok.length) : 0
  })()
  const topProvider = stats.find(s => parseInt(s.successes) > 0)?.provider ?? 'N/A'

  const chartData = stats.map(s => ({
    name: s.provider.replace('-search', '').replace('-free', '').slice(0, 9),
    successRate: Math.round((parseInt(s.successes) / parseInt(s.total)) * 100),
    avgLatency: Math.round(s.avg_latency_ms / 1000 * 10) / 10,
  }))

  const timelineData = digests.slice(0, 14).reverse().map(d => ({
    date: d.date?.slice(5, 10) ?? '',
    level: Number(d.fallback_level),
  }))

  const costChartData = costData?.perProvider.filter(p => p.totalTokens > 0).map(p => ({
    name: p.provider.replace('-search', '').replace('-free', '').slice(0, 9),
    tokens: Math.round(p.totalTokens / 1000),
    cost: parseFloat((p.estimatedCostUsd * 100).toFixed(4)),
  })) ?? []

  return (
    <div className="page-container fade-in" style={{ paddingTop: '40px', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px', borderBottom: '3px double var(--rule)', paddingBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '2rem', color: 'var(--ink)', marginBottom: '4px' }}>
          Operations Centre
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
          Provider performance, generation history, and cost analysis
        </p>
      </div>

      {error && <div style={{ marginBottom: '24px' }}><ErrorBanner message={error} /></div>}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', background: 'var(--rule)', marginBottom: '40px', border: '1px solid var(--rule)' }}>
        <StatCard label="Editions Published" value={totalRuns} sub="in PostgreSQL" />
        <StatCard label="Avg Success Rate" value={`${successRate}%`} sub="across all providers" accent />
        <StatCard label="Avg Generation" value={`${(avgLatency/1000).toFixed(1)}s`} sub="successful calls" />
        <StatCard label="Est. Total Cost" value={`$${costData?.totalCostUsd.toFixed(4) ?? '0.0000'}`} sub="USD estimated" />
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--rule)', marginBottom: '32px', gap: 0 }}>
        {([['overview', 'Performance Overview'], ['costs', 'Cost Analysis']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', fontSize: '12px', fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--accent)' : 'transparent'}`,
              marginBottom: '-1px',
              color: activeTab === tab ? 'var(--accent)' : 'var(--ink-4)',
              transition: 'color 0.15s'
            }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            
            <div className="ed-card" style={{ padding: '24px' }}>
              <SectionHeader title="Success Rate by Provider" />
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ left: -20, bottom: 30, right: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }} angle={-40} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--ink-4)' }} tickFormatter={v => `${v}%`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Success Rate']} />
                    <Bar dataKey="successRate" radius={[2,2,0,0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '40px', fontSize: '13px' }}>No data yet</p>}
            </div>

            <div className="ed-card" style={{ padding: '24px' }}>
              <SectionHeader title="Avg Latency (seconds)" />
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ left: -20, bottom: 30, right: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }} angle={-40} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--ink-4)' }} tickFormatter={v => `${v}s`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}s`, 'Avg Latency']} />
                    <Bar dataKey="avgLatency" radius={[2,2,0,0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.75} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '40px', fontSize: '13px' }}>No data yet</p>}
            </div>

            {timelineData.length > 1 && (
              <div className="ed-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
                <SectionHeader title="Fallback Level — Last 14 Editions" />
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={timelineData} margin={{ left: -20, right: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" horizontal={true} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--ink-4)' }} domain={[1, 5]} reversed ticks={[1,2,3,4,5]} tickFormatter={v => `L${v}`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`Level ${v}`, 'Fallback']} />
                    <Line type="monotone" dataKey="level" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
                <p style={{ fontSize: '11px', color: 'var(--ink-4)', marginTop: '8px' }}>Level 1 = AI with search (best) · Level 5 = blank template (worst)</p>
              </div>
            )}
          </div>

          {/* Editions + logs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1px', background: 'var(--rule)', border: '1px solid var(--rule)' }}>
            
            {/* Edition list */}
            <div style={{ background: 'var(--card)', padding: '24px' }}>
              <SectionHeader title="Recent Editions" />
              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '420px', overflowY: 'auto' }}>
                {digests.map(d => {
                  const ds = d.date?.slice(0, 10)
                  const sel = selectedDate === ds
                  return (
                    <button key={d.id} onClick={() => setSelectedDate(ds)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', textAlign: 'left', background: sel ? 'var(--paper-alt)' : 'none',
                        border: 'none', borderBottom: '1px solid var(--rule)', cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}>
                      <div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600, color: sel ? 'var(--accent)' : 'var(--ink-2)' }}>{ds}</div>
                        <div style={{ fontSize: '10px', color: 'var(--ink-4)', marginTop: '2px' }}>
                          {d.created_at ? format(parseISO(d.created_at), 'HH:mm') : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <ProviderBadge provider={d.provider_used} />
                        <LevelBadge level={d.fallback_level} />
                      </div>
                    </button>
                  )
                })}
                {digests.length === 0 && <p style={{ fontSize: '13px', color: 'var(--ink-4)', textAlign: 'center', padding: '40px' }}>No editions yet</p>}
              </div>
            </div>

            {/* Provider attempt log */}
            <div style={{ background: 'var(--card)', padding: '24px' }}>
              <SectionHeader title={`Provider Attempts — ${selectedDate ?? '—'}`} />
              {logsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>
              ) : logs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--rule)', maxHeight: '420px', overflowY: 'auto' }}>
                  {logs.map(log => (
                    <div key={log.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', background: 'var(--card)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {log.success
                          ? <CheckCircle2 size={13} style={{ color: 'var(--positive)', flexShrink: 0 }} />
                          : <XCircle size={13} style={{ color: 'var(--negative)', flexShrink: 0 }} />}
                        <div>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>{log.provider}</span>
                          {log.error_message && <div style={{ fontSize: '11px', color: 'var(--ink-4)' }}>{log.error_message}</div>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--ink-3)' }}>{log.latency_ms}ms</div>
                        {log.tokens_used && <div style={{ fontSize: '10px', color: 'var(--ink-4)' }}>{log.tokens_used.toLocaleString()} tokens</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--ink-4)', textAlign: 'center', padding: '40px' }}>
                  {selectedDate ? 'No logs for this edition' : 'Select an edition'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'costs' && costData && (
        <div>
          <div style={{ padding: '16px 20px', background: 'var(--accent-light)', border: '1px solid var(--accent-mid)', borderRadius: '2px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: '4px' }}>
                  Total Estimated Cost
                </div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 700, color: 'var(--ink)' }}>
                  ${costData.totalCostUsd.toFixed(4)} USD
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--ink-3)', maxWidth: '360px' }}>{costData.note}</p>
            </div>
          </div>

          {costChartData.length > 0 && (
            <div className="ed-card" style={{ padding: '24px', marginBottom: '28px' }}>
              <SectionHeader title="Estimated Cost by Provider (¢ cents)" />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={costChartData} margin={{ left: -10, bottom: 30, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }} angle={-40} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-4)' }} tickFormatter={v => `¢${v}`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`¢${v}`, 'Est. Cost']} />
                  <Bar dataKey="cost" radius={[2,2,0,0]}>
                    {costChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Breakdown table */}
          <div className="ed-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--rule)' }}>
              <SectionHeader title="Provider Breakdown" />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                    {['Provider', 'Total Tokens', 'Calls (OK/Total)', 'Est. Cost'].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {costData.perProvider.filter(p => p.totalTokens > 0).map((p, i) => (
                    <tr key={p.provider} style={{ borderBottom: '1px solid var(--rule)', background: i % 2 === 0 ? 'transparent' : 'var(--paper-alt)' }}>
                      <td style={{ padding: '10px 20px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--ink)' }}>{p.provider}</td>
                      <td style={{ padding: '10px 20px', color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace' }}>{p.totalTokens.toLocaleString()}</td>
                      <td style={{ padding: '10px 20px', color: 'var(--ink-3)' }}>{p.successfulCalls}/{p.totalCalls}</td>
                      <td style={{ padding: '10px 20px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--accent)' }}>${p.estimatedCostUsd.toFixed(5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {costData.perProvider.filter(p => p.totalTokens > 0).length === 0 && (
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-4)', fontSize: '13px' }}>No token data yet. Generate an edition first.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
