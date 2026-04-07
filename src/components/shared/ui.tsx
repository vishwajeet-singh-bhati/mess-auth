// components/shared/ui.tsx — Brutalist Dark

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
  primary:   { background: '#fff',  color: '#000', border: '1px solid #fff' },
  secondary: { background: '#1a1a1a', color: '#fff', border: '1px solid #2e2e2e' },
  ghost:     { background: 'transparent', color: '#ccc', border: '1px solid #2e2e2e' },
  danger:    { background: 'transparent', color: '#ccc', border: '1px solid #3a3a3a' },
  success:   { background: 'transparent', color: '#ccc', border: '1px solid #3a3a3a' },
}

const BUTTON_SIZES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '0.35rem 0.85rem', fontSize: '0.78rem', borderRadius: '4px' },
  md: { padding: '0.6rem 1.2rem',   fontSize: '0.88rem', borderRadius: '6px' },
  lg: { padding: '0.8rem 1.5rem',   fontSize: '0.95rem', borderRadius: '8px' },
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
        opacity: disabled || loading ? 0.4 : 1,
        transition: 'opacity 0.15s',
        width: fullWidth ? '100%' : undefined,
        letterSpacing: '0',
        ...BUTTON_STYLES[variant],
        ...BUTTON_SIZES[size],
        ...style,
      }}
      {...props}
    >
      {loading && <Spinner size={13} color={variant === 'primary' ? '#000' : '#fff'} />}
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
    <div onClick={onClick} style={{
      background:   '#111',
      border:       '1px solid #1e1e1e',
      borderRadius: '10px',
      padding:      '1.25rem',
      cursor:       onClick ? 'pointer' : undefined,
      transition:   hoverable ? 'border-color 0.15s' : undefined,
      ...style,
    }} {...props}>
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple'

const BADGE_STYLES: Record<BadgeVariant, CSSProperties> = {
  default: { background: '#1a1a1a', color: '#999',  border: '1px solid #2e2e2e' },
  success: { background: '#1a1a1a', color: '#ccc',  border: '1px solid #3a3a3a' },
  danger:  { background: '#1a1a1a', color: '#ccc',  border: '1px solid #3a3a3a' },
  warning: { background: '#1a1a1a', color: '#ccc',  border: '1px solid #3a3a3a' },
  info:    { background: '#1a1a1a', color: '#ccc',  border: '1px solid #3a3a3a' },
  purple:  { background: '#1a1a1a', color: '#999',  border: '1px solid #2e2e2e' },
}

export function Badge({ variant = 'default', size = 'md', children }: {
  variant?: BadgeVariant; size?: 'sm' | 'md'; children: ReactNode
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      borderRadius: '4px', fontWeight: 600,
      fontSize:  size === 'sm' ? '0.65rem' : '0.7rem',
      padding:   size === 'sm' ? '0.12rem 0.45rem' : '0.2rem 0.6rem',
      letterSpacing: '0.04em',
      ...BADGE_STYLES[variant],
    }}>
      {children}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size,
      border: `${Math.max(2, size / 9)}px solid rgba(255,255,255,0.1)`,
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
        width: '52px', height: '52px', borderRadius: '10px',
        background: '#111', border: '1px solid #2e2e2e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.4rem', marginBottom: '0.25rem',
      }}>{icon}</div>
      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{title}</div>
      {subtitle && <div style={{ color: '#888', fontSize: '0.82rem',
        maxWidth: '240px', lineHeight: 1.5 }}>{subtitle}</div>}
      {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
      <div style={{ flex: 1, height: '1px', background: '#1e1e1e' }} />
      {label && <span style={{ fontSize: '0.72rem', color: '#555',
        whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>}
      <div style={{ flex: 1, height: '1px', background: '#1e1e1e' }} />
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <h2 style={{
        fontSize: '0.65rem', fontWeight: 700, color: '#666',
        textTransform: 'uppercase', letterSpacing: '0.12em',
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
        <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#888',
          textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <div style={{ position: 'absolute', left: '0.85rem',
            color: '#555', pointerEvents: 'none' }}>{prefix}</div>
        )}
        <input style={{
          width: '100%',
          padding: prefix ? '0.75rem 1rem 0.75rem 2.5rem' : '0.75rem 1rem',
          background: '#111',
          border: `1px solid ${error ? '#3a3a3a' : '#2e2e2e'}`,
          borderRadius: '8px', color: '#fff',
          fontSize: '0.92rem', outline: 'none',
          ...style,
        }} {...props} />
      </div>
      {error && <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '0.75rem', color: '#666' }}>{hint}</span>}
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────────

export function Alert({ variant = 'info', children }: { variant?: string; children: ReactNode }) {
  return (
    <div style={{
      borderRadius: '8px', padding: '0.75rem 1rem',
      fontSize: '0.85rem', lineHeight: 1.5,
      background: '#111', border: '1px solid #2e2e2e', color: '#ccc',
    }}>{children}</div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

export function StatCard({ label, value, icon, color = '#fff', sublabel }: {
  label: string; value: string | number; icon: string; color?: string; sublabel?: string
}) {
  return (
    <Card style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '0.65rem' }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%',
          background: '#333', marginTop: '5px' }} />
      </div>
      <div style={{
        fontFamily: "'DM Serif Display', Georgia, serif",
        fontSize: '1.8rem', fontWeight: 400, color: '#fff',
        lineHeight: 1, letterSpacing: '-0.02em',
      }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: '#888',
        marginTop: '0.3rem', fontWeight: 500, letterSpacing: '0.04em',
        textTransform: 'uppercase' }}>{label}</div>
      {sublabel && <div style={{ fontSize: '0.68rem', color: '#555',
        marginTop: '0.1rem', fontFamily: "'JetBrains Mono', monospace" }}>{sublabel}</div>}
    </Card>
  )
}