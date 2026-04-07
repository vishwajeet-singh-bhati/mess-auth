'use client'
// components/shared/TopBar.tsx

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ReactNode } from 'react'

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
      background: 'rgba(0,0,0,0.95)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid #1e1e1e',
      padding: '0 1rem',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      height: '52px', minHeight: '52px',
    }}>
      {back && (
        <button onClick={() => router.back()} style={{
          background: 'none', border: '1px solid #2e2e2e',
          borderRadius: '6px', width: '30px', height: '30px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#999', fontSize: '0.85rem', cursor: 'pointer', flexShrink: 0,
        }}>←</button>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontWeight: 400, fontSize: '1rem',
          color: '#fff', letterSpacing: '-0.01em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{title}</div>
        {subtitle && (
          <div style={{
            fontSize: '0.7rem', color: '#888',
            fontFamily: "'JetBrains Mono', monospace",
            marginTop: '1px',
          }}>{subtitle}</div>
        )}
      </div>

      {action && <div style={{ flexShrink: 0 }}>{action}</div>}

      {userName && (
        <button onClick={handleSignOut} title={`Sign out`} style={{
          background: 'none', border: '1px solid #2e2e2e',
          borderRadius: '6px', padding: '0.25rem 0.6rem',
          color: '#888', fontSize: '0.7rem', fontWeight: 500,
          cursor: 'pointer', flexShrink: 0,
          transition: 'border-color 0.15s, color 0.15s',
        }}>
          Sign out
        </button>
      )}
    </header>
  )
}
