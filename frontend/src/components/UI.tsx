import { ReactNode } from 'react'
import { Loader2, AlertCircle, Inbox } from 'lucide-react'

// ── Spinner ────────────────────────────────────────────────────────────
export function Spinner({ size = 18 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" style={{ color: 'var(--ink-3)' }} />
}

// ── Button ─────────────────────────────────────────────────────────────
export function Button({
  children, variant = 'primary', loading = false, className = '', ...props
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = variant === 'primary' ? 'btn-primary' : variant === 'secondary' ? 'btn-secondary' : 'btn-ghost'
  return (
    <button {...props} disabled={loading || props.disabled} className={`${cls} ${className}`}>
      {loading && <Spinner size={13} />}
      {children}
    </button>
  )
}

// ── Input ──────────────────────────────────────────────────────────────
export function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
          {label}
        </label>
      )}
      <input className="ed-input" {...props} />
    </div>
  )
}

// ── Error banner ───────────────────────────────────────────────────────
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '12px 16px', background: 'var(--card)',
      border: '1px solid var(--rule)', borderLeft: '4px solid var(--negative)',
      borderRadius: '2px', fontSize: '13px', color: 'var(--ink-2)'
    }}>
      <AlertCircle size={14} style={{ color: 'var(--negative)', flexShrink: 0, marginTop: '1px' }} />
      {message}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────
export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <Inbox size={36} style={{ color: 'var(--ink-5)', margin: '0 auto 16px' }} />
      <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', color: 'var(--ink-2)', marginBottom: '8px' }}>{title}</p>
      {subtitle && <p style={{ fontSize: '13px', color: 'var(--ink-4)' }}>{subtitle}</p>}
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent = false }: {
  label: string; value: string | number; sub?: string; accent?: boolean
}) {
  return (
    <div className="stat-card" style={{ borderTopColor: accent ? 'var(--accent)' : 'var(--ink)' }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// ── Meta badges ────────────────────────────────────────────────────────
export function LevelBadge({ level }: { level: number }) {
  const color = level === 1 ? 'var(--positive)' : level === 2 ? 'var(--ink-3)' : level <= 3 ? '#D97706' : 'var(--negative)'
  return (
    <span className="meta-badge" style={{ borderColor: color, color }}>
      Level {level}
    </span>
  )
}

export function ProviderBadge({ provider }: { provider: string }) {
  return <span className="meta-badge">{provider}</span>
}

// ── Card ───────────────────────────────────────────────────────────────
export function Card({ children, className = '', accent = false }: {
  children: ReactNode; className?: string; accent?: boolean
}) {
  return (
    <div
      className={`ed-card ${className}`}
      style={accent ? { borderTop: '3px solid var(--accent)' } : {}}
    >
      {children}
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────
export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="section-header">
      <div className="section-header-rule-accent" />
      <span className="section-header-title">{title}</span>
      <div className="section-header-rule" />
    </div>
  )
}
