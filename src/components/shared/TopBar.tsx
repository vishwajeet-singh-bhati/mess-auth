'use client'
// components/shared/TopBar.tsx

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CSSProperties, ReactNode } from 'react'

interface TopBarProps {
  title:     string
  subtitle?: string
  back?:     boolean
  action?:   ReactNode
  userName?: string
}

export function TopBar({ title, subtitle, back, action, userName }: TopBarProps) {
  const router   = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(8,10,15,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '0 1rem',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      height: '56px', minHeight: '56px',
    }}>
      {back && (
        <button onClick={() => router.back()} style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          width: '32px', height: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-2)', fontSize: '0.9rem', cursor: 'pointer',
          flexShrink: 0, transition: 'background 0.15s',
        }}>
          ←
        </button>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700, fontSize: '0.95rem',
          color: 'var(--text)',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: '0.7rem', color: 'var(--text-3)',
            fontFamily: "'JetBrains Mono', monospace",
            marginTop: '1px',
          }}>
            {subtitle}
          </div>
        )}
      </div>

      {action && <div style={{ flexShrink: 0 }}>{action}</div>}

      {userName && (
        <button onClick={handleSignOut}
          title={`Signed in as ${userName} — click to sign out`}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '0.3rem 0.6rem',
            color: 'var(--text-3)',
            fontSize: '0.72rem', fontWeight: 500,
            cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            transition: 'all 0.15s',
          }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>⏻</span>
        </button>
      )}
    </header>
  )
}