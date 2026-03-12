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
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <header
      style={{
        position:        'sticky',
        top:             0,
        zIndex:          50,
        background:      'rgba(7, 13, 26, 0.9)',
        backdropFilter:  'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom:    '1px solid var(--border)',
        padding:         '0.75rem 1rem',
        display:         'flex',
        alignItems:      'center',
        gap:             '0.75rem',
        minHeight:       '56px',
      }}
    >
      {back && (
        <button
          onClick={() => router.back()}
          style={{
            background:   'none',
            border:       'none',
            color:        'var(--text-dim)',
            fontSize:     '1.1rem',
            padding:      '0.25rem',
            cursor:       'pointer',
            flexShrink:   0,
            lineHeight:   1,
          }}
          aria-label="Go back"
        >
          ←
        </button>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight:    800,
          fontSize:      '1rem',
          color:         'var(--text)',
          letterSpacing: '-0.01em',
          whiteSpace:    'nowrap',
          overflow:      'hidden',
          textOverflow:  'ellipsis',
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
            {subtitle}
          </div>
        )}
      </div>

      {action && <div style={{ flexShrink: 0 }}>{action}</div>}

      {userName && (
        <button
          onClick={handleSignOut}
          title={`Signed in as ${userName} — click to sign out`}
          style={{
            background:   'var(--surface-high)',
            border:       '1px solid var(--border)',
            borderRadius: '0.5rem',
            padding:      '0.3rem 0.6rem',
            color:        'var(--text-muted)',
            fontSize:     '0.72rem',
            fontWeight:   600,
            cursor:       'pointer',
            flexShrink:   0,
            display:      'flex',
            alignItems:   'center',
            gap:          '0.3rem',
          }}
        >
          <span style={{ fontSize: '0.8rem' }}>⏻</span>
        </button>
      )}
    </header>
  )
}
