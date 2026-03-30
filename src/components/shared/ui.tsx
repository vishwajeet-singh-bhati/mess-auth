// components/shared/ui.tsx — Premium Dark UI Primitives

import { type CSSProperties, type ReactNode } from 'react'

// ── Button ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant
  size?:      ButtonSize
  loading?:   boolean
  fullWidth?: boolean
  children:   ReactNode
}

const BUTTON_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary:   {
    background: 'var(--accent)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: '0 0 20px rgba(99,102,241,0.3)',
  },
  secondary: {
    background: 'var(--surface-2)',
    color: 'var(--text)',
    border: '1px solid var(--border-2)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-2)',
    border: '1px solid var(--border)',
  },
  danger: {
    background: 'var(--red-dim)',
    color: 'var(--red)',
    border: '1px solid var(--red-border)',
  },
  success: {
    background: 'var(--green-dim)',
    color: 'var(--green)',
    border: '1px solid var(--green-border)',
  },
}

const BUTTON_SIZES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '0.35rem 0.85rem', fontSize: '0.78rem', borderRadius: '6px' },
  md: { padding: '0.6rem 1.2rem',   fontSize: '0.88rem', borderRadius: '8px' },
  lg: { padding: '0.8rem 1.5rem',   fontSize: '0.95rem', borderRadius: '10px' },
}

export function Button({
  variant = 'primary', size = 'md', loading = false,
  fullWidth = false, children, disabled, style, ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', gap: '0.45rem',
        fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        transition: 'opacity 0.15s, transform 0.1s',
        width: fullWidth ? '100%' : undefined,
        letterSpacing: '-0.01em',
        ...BUTTON_STYLES[variant],
        ...BUTTON_SIZES[size],
        ...style,
      }}
      {...props}
    >
      {loading && <Spinner size={13} />}
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  children:   ReactNode
  style?:     CSSProperties
  className?: string
  onClick?:   () => void
  hoverable?: boolean
}

export function Card({ children, style, hoverable, onClick, ...props }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: '14px',
        padding:      '1.25rem',
        cursor:       onClick ? 'pointer' : undefined,
        transition:   hoverable ? 'border-color 0.2s, background 0.2s' : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple'

const BADGE_STYLES: Record<BadgeVariant, CSSProperties> = {
  default: { background: 'var(--surface-2)',  color: 'var(--text-2)',  border: '1px solid var(--border-2)' },
  success: { background: 'var(--green-dim)',   color: 'var(--green)',   border: '1px solid var(--green-border)' },
  danger:  { background: 'var(--red-dim)',     color: 'var(--red)',     border: '1px solid var(--red-border)' },
  warning: { background: 'var(--yellow-dim)',  color: 'var(--yellow)',  border: '1px solid var(--yellow-border)' },
  info:    { background: 'var(--blue-dim)',    color: 'var(--blue)',    border: '1px solid var(--blue-border)' },
  purple:  { background: 'var(--purple-dim)',  color: 'var(--purple)',  border: '1px solid var(--purple-border)' },
}

export function Badge({ variant = 'default', size = 'md', children }: {
  variant?: BadgeVariant; size?: 'sm' | 'md'; children: ReactNode
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      borderRadius: '6px', fontWeight: 600,
      fontSize:  size === 'sm' ? '0.65rem' : '0.7rem',
      padding:   size === 'sm' ? '0.12rem 0.45rem' : '0.2rem 0.6rem',
      letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif",
      ...BADGE_STYLES[variant],
    }}>
      {children}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size,
      border: `${Math.max(2, size / 9)}px solid rgba(255,255,255,0.12)`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, subtitle, action }: {
  icon: string; title: string; subtitle?: string; action?: ReactNode
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '3rem 1.5rem',
      textAlign: 'center', gap: '0.75rem',
    }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '16px',
        background: 'var(--surface-2)', border: '1px solid var(--border-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem', marginBottom: '0.25rem',
      }}>{icon}</div>
      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem',
        fontFamily: "'Syne', sans-serif" }}>{title}</div>
      {subtitle && <div style={{ color: 'var(--text-3)', fontSize: '0.82rem',
        maxWidth: '240px', lineHeight: 1.5 }}>{subtitle}</div>}
      {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      {label && <span style={{ fontSize: '0.72rem', color: 'var(--text-3)',
        whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>}
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <h2 style={{
        fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        fontFamily: "'DM Sans', sans-serif",
      }}>{title}</h2>
      {action}
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string; prefix?: ReactNode
}

export function Input({ label, error, hint, prefix, style, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {label && (
        <label style={{
          fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>{label}</label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <div style={{ position: 'absolute', left: '0.85rem',
            color: 'var(--text-3)', pointerEvents: 'none' }}>{prefix}</div>
        )}
        <input style={{
          width: '100%',
          padding: prefix ? '0.75rem 1rem 0.75rem 2.5rem' : '0.75rem 1rem',
          background: 'var(--surface)',
          border: `1px solid ${error ? 'var(--red-border)' : 'var(--border-2)'}`,
          borderRadius: '10px', color: 'var(--text)',
          fontSize: '0.92rem', outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          ...style,
        }} {...props} />
      </div>
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--red)' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{hint}</span>}
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────────

const ALERT_STYLES: Record<string, CSSProperties> = {
  info:    { background: 'rgba(96,165,250,0.08)',  border: '1px solid var(--blue-border)',   color: '#93c5fd' },
  success: { background: 'var(--green-dim)',        border: '1px solid var(--green-border)',  color: '#6ee7b7' },
  warning: { background: 'var(--yellow-dim)',       border: '1px solid var(--yellow-border)', color: '#fde68a' },
  error:   { background: 'var(--red-dim)',          border: '1px solid var(--red-border)',    color: '#fca5a5' },
}

export function Alert({ variant = 'info', children }: { variant?: string; children: ReactNode }) {
  return (
    <div style={{
      borderRadius: '10px', padding: '0.75rem 1rem',
      fontSize: '0.85rem', lineHeight: 1.5,
      ...ALERT_STYLES[variant],
    }}>{children}</div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

export function StatCard({ label, value, icon, color = 'var(--accent)', sublabel }: {
  label: string; value: string | number; icon: string; color?: string; sublabel?: string
}) {
  return (
    <Card style={{ padding: '1rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '-10px', right: '-10px',
        width: '60px', height: '60px', borderRadius: '50%',
        background: color, opacity: 0.06, filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: color, boxShadow: `0 0 8px ${color}`,
          marginTop: '4px',
        }} />
      </div>
      <div style={{
        fontSize: '1.75rem', fontWeight: 800, color,
        lineHeight: 1, letterSpacing: '-0.03em',
        fontFamily: "'Syne', sans-serif",
      }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)',
        marginTop: '0.35rem', fontWeight: 500, letterSpacing: '0.02em' }}>
        {label}
      </div>
      {sublabel && <div style={{ fontSize: '0.68rem', color: 'var(--text-4)',
        marginTop: '0.1rem', fontFamily: "'JetBrains Mono', monospace" }}>
        {sublabel}
      </div>}
    </Card>
  )
}