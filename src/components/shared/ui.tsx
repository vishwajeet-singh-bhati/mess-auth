// components/shared/ui.tsx
// Lean, reusable UI primitives — no external component library needed.
// All styled with inline styles using CSS variables from globals.css.

import { type CSSProperties, type ReactNode } from 'react'

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant
  size?:     ButtonSize
  loading?:  boolean
  fullWidth?: boolean
  children:  ReactNode
}

const BUTTON_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary:   { background: 'var(--accent)',       color: '#fff',          border: '1px solid transparent' },
  secondary: { background: 'var(--surface-high)', color: 'var(--text)',   border: '1px solid var(--border)' },
  ghost:     { background: 'transparent',          color: 'var(--text-dim)', border: '1px solid transparent' },
  danger:    { background: 'var(--red-dim)',        color: 'var(--red)',    border: '1px solid var(--red-border)' },
  success:   { background: 'var(--green-dim)',      color: 'var(--green)',  border: '1px solid var(--green-border)' },
}

const BUTTON_SIZES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '0.4rem 0.9rem',  fontSize: '0.8rem',  borderRadius: 'var(--radius-sm)' },
  md: { padding: '0.65rem 1.2rem', fontSize: '0.9rem',  borderRadius: 'var(--radius-md)' },
  lg: { padding: '0.85rem 1.5rem', fontSize: '1rem',    borderRadius: 'var(--radius-md)' },
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '0.5rem',
        fontWeight:     600,
        fontFamily:     'inherit',
        cursor:         disabled || loading ? 'not-allowed' : 'pointer',
        opacity:        disabled || loading ? 0.6 : 1,
        transition:     'opacity 0.15s, transform 0.1s',
        width:          fullWidth ? '100%' : undefined,
        ...BUTTON_STYLES[variant],
        ...BUTTON_SIZES[size],
        ...style,
      }}
      {...props}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  style?:   CSSProperties
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export function Card({ children, style, hoverable, onClick, ...props }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding:      '1.25rem',
        cursor:       onClick ? 'pointer' : undefined,
        transition:   hoverable ? 'border-color 0.15s, transform 0.15s' : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple'

const BADGE_STYLES: Record<BadgeVariant, CSSProperties> = {
  default: { background: 'var(--surface-high)', color: 'var(--text-dim)',  border: '1px solid var(--border)' },
  success: { background: 'var(--green-dim)',     color: 'var(--green)',     border: '1px solid var(--green-border)' },
  danger:  { background: 'var(--red-dim)',        color: 'var(--red)',       border: '1px solid var(--red-border)' },
  warning: { background: 'var(--yellow-bg)',      color: 'var(--yellow)',    border: '1px solid var(--yellow-border)' },
  info:    { background: 'var(--accent-dim)',     color: 'var(--accent)',    border: '1px solid rgba(59,130,246,0.3)' },
  purple:  { background: 'var(--purple-dim)',     color: 'var(--purple)',    border: '1px solid rgba(139,92,246,0.3)' },
}

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  size?: 'sm' | 'md'
}

export function Badge({ variant = 'default', size = 'md', children }: BadgeProps) {
  return (
    <span
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          '0.3rem',
        borderRadius: '0.4rem',
        fontWeight:   700,
        fontSize:     size === 'sm' ? '0.68rem' : '0.75rem',
        padding:      size === 'sm' ? '0.15rem 0.5rem' : '0.25rem 0.65rem',
        letterSpacing: '0.03em',
        ...BADGE_STYLES[variant],
      }}
    >
      {children}
    </span>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 20, color = 'var(--accent)' }: { size?: number; color?: string }) {
  return (
    <div
      style={{
        width:        size,
        height:       size,
        border:       `${Math.max(2, size / 8)}px solid transparent`,
        borderTopColor: color,
        borderRadius: '50%',
        animation:    'spin 0.7s linear infinite',
        flexShrink:   0,
      }}
    />
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon:     string
  title:    string
  subtitle?: string
  action?:  ReactNode
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '3rem 1.5rem',
        textAlign:      'center',
        gap:            '0.75rem',
      }}
    >
      <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{icon}</div>
      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>{title}</div>
      {subtitle && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '260px' }}>{subtitle}</div>}
      {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {label && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <h2 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {title}
      </h2>
      {action}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:  string
  error?:  string
  hint?:   string
  prefix?: ReactNode
}

export function Input({ label, error, hint, prefix, style, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {label && (
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <div style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>
            {prefix}
          </div>
        )}
        <input
          style={{
            width:        '100%',
            padding:      prefix ? '0.75rem 1rem 0.75rem 2.5rem' : '0.75rem 1rem',
            background:   'var(--bg-elevated)',
            border:       `1px solid ${error ? 'var(--red-border)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            color:        'var(--text)',
            fontSize:     '0.95rem',
            outline:      'none',
            transition:   'border-color 0.15s',
            ...style,
          }}
          {...props}
        />
      </div>
      {error && <span style={{ fontSize: '0.78rem', color: 'var(--red)' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  )
}

// ─── Alert ────────────────────────────────────────────────────────────────────

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

const ALERT_STYLES: Record<AlertVariant, CSSProperties> = {
  info:    { background: 'var(--accent-dim)',  border: '1px solid rgba(59,130,246,0.25)',  color: '#93c5fd' },
  success: { background: 'var(--green-dim)',   border: '1px solid var(--green-border)',    color: '#86efac' },
  warning: { background: 'var(--yellow-bg)',   border: '1px solid var(--yellow-border)',   color: '#fde68a' },
  error:   { background: 'var(--red-dim)',     border: '1px solid var(--red-border)',      color: '#fca5a5' },
}

export function Alert({ variant = 'info', children }: { variant?: AlertVariant; children: ReactNode }) {
  return (
    <div style={{
      borderRadius: 'var(--radius-md)',
      padding: '0.75rem 1rem',
      fontSize: '0.85rem',
      lineHeight: 1.5,
      ...ALERT_STYLES[variant]
    }}>
      {children}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

export function StatCard({
  label, value, icon, color = 'var(--accent)', sublabel
}: {
  label: string; value: string | number; icon: string; color?: string; sublabel?: string
}) {
  return (
    <Card style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '1.3rem' }}>{icon}</span>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: color, boxShadow: `0 0 8px ${color}`, marginTop: '4px'
        }} />
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.03em' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontWeight: 600 }}>
        {label}
      </div>
      {sublabel && <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '0.1rem' }}>{sublabel}</div>}
    </Card>
  )
}
