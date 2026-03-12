'use client'
// app/(staff)/verify/page.tsx

import { useState, useRef } from 'react'
import { TopBar } from '@/components/shared/TopBar'
import { Button, Alert, Card, Badge } from '@/components/shared/ui'
import type { AuthResponse } from '@/types/api'

interface AttemptLog {
  roll: string
  name?: string
  success: boolean
  label: string
  time: string
}

export default function StaffVerifyPage() {
  const [roll, setRoll]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<AuthResponse | null>(null)
  const [log, setLog]           = useState<AttemptLog[]>([])
  const inputRef                = useRef<HTMLInputElement>(null)

  const handleVerify = async () => {
    const trimmedRoll = roll.trim().toUpperCase()
    if (!trimmedRoll) return

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/auth/manual', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ roll_number: trimmedRoll }),
      })
      const data: AuthResponse = await res.json()

      setResult(data)
      setLog(prev => [{
        roll:    trimmedRoll,
        name:    data.success ? data.data.student_name : undefined,
        success: data.success,
        label:   data.success
          ? `${data.data.meal_type} · ${data.data.mess_name}`
          : (data as any).reason?.replace(/_/g, ' ') ?? 'denied',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }, ...prev.slice(0, 19)])
    } catch {
      setResult({ success: false, reason: 'invalid_token', message: 'Network error. Please try again.' })
    }

    setLoading(false)
    setRoll('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <>
      <TopBar title="Manual Verification" back subtitle="Fallback entry system" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        {/* Info */}
        <div style={{
          background:   'var(--surface-high)',
          border:       '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding:      '0.75rem 1rem',
          fontSize:     '0.82rem', color: 'var(--text-dim)', lineHeight: 1.5,
          display:      'flex', gap: '0.5rem',
        }}>
          <span>💡</span>
          <span>Use this when a student's phone camera or internet is unavailable. All manual entries are logged.</span>
        </div>

        {/* Roll number input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Student Roll Number
          </label>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <input
              ref={inputRef}
              value={roll}
              onChange={e => setRoll(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && !loading && handleVerify()}
              placeholder="e.g. CS21B001"
              autoFocus
              style={{
                flex:         1,
                padding:      '0.85rem 1rem',
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color:        'var(--text)',
                fontSize:     '1.1rem',
                fontFamily:   "'JetBrains Mono', monospace",
                fontWeight:   600,
                outline:      'none',
                letterSpacing: '0.06em',
              }}
            />
            <Button
              size="lg"
              onClick={handleVerify}
              loading={loading}
              disabled={!roll.trim()}
              style={{ minWidth: '90px' }}
            >
              {loading ? '' : 'Verify'}
            </Button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div
            className="animate-slide-up"
            style={{
              background:   result.success ? 'var(--green-bg)' : 'var(--red-bg)',
              border:       `1px solid ${result.success ? 'var(--green-border)' : 'var(--red-border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding:      '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: result.success ? '1rem' : '0.5rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: result.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', flexShrink: 0,
              }}>
                {result.success ? '✓' : '✗'}
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.1rem',
                  color: result.success ? 'var(--green)' : 'var(--red)', letterSpacing: '-0.01em' }}>
                  {result.success ? 'AUTHORIZED' : 'DENIED'}
                </div>
                {!result.success && (
                  <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: '0.1rem' }}>
                    {(result as any).reason?.replace(/_/g, ' ').toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {result.success ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { label: 'Name',   value: result.data.student_name },
                  { label: 'Roll',   value: result.data.roll_number },
                  { label: 'Mess',   value: result.data.mess_name },
                  { label: 'Meal',   value: result.data.meal_type.charAt(0).toUpperCase() + result.data.meal_type.slice(1) },
                ].map(item => (
                  <div key={item.label} style={{ background: 'rgba(0,0,0,0.3)',
                    borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#86efac60', marginBottom: '0.1rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#bbf7d0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#fca5a5', margin: 0, lineHeight: 1.5 }}>
                {(result as any).message}
              </p>
            )}
          </div>
        )}

        {/* Attempt log */}
        {log.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              Session Log ({log.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '280px', overflowY: 'auto' }}>
              {log.map((entry, i) => (
                <div key={i} style={{
                  display:      'flex', alignItems: 'center', gap: '0.75rem',
                  padding:      '0.6rem 0.9rem',
                  background:   'var(--surface)',
                  border:       `1px solid ${entry.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: 'var(--radius-md)',
                }}>
                  <span style={{ color: entry.success ? 'var(--green)' : 'var(--red)', fontSize: '0.9rem', flexShrink: 0 }}>
                    {entry.success ? '✓' : '✗'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)',
                      fontFamily: "'JetBrains Mono', monospace" }}>
                      {entry.roll}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.05rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.name ?? entry.label}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'monospace' }}>
                    {entry.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
