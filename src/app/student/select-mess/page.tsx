'use client'
// app/(student)/select-mess/page.tsx
// Student lands here from dashboard when they have no subscription.
// Confirms their mess choice and calls the API to create the subscription.

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/shared/TopBar'
import { Card, Button, Alert } from '@/components/shared/ui'
import type { MessId } from '@/types/database'

const MESS_INFO: Record<MessId, { label: string; color: string; emoji: string; location: string }> = {
  mess_a: { label: 'Mess A', color: '#2563eb', emoji: '🔵', location: 'Block A entrance' },
  mess_b: { label: 'Mess B', color: '#16a34a', emoji: '🟢', location: 'Block B entrance' },
}

function SelectMessContent() {
  const router      = useRouter()
  const params      = useSearchParams()
  const messParam   = params.get('mess') as MessId | null

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const supabase = createClient()

  // Redirect if invalid param
  useEffect(() => {
    if (messParam && !['mess_a', 'mess_b'].includes(messParam)) {
      router.replace('/student/dashboard')
    }
  }, [messParam])

  if (!messParam || !['mess_a', 'mess_b'].includes(messParam)) return null

  const mess = MESS_INFO[messParam]

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/subscriptions/select', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mess_id: messParam }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    setConfirmed(true)
    setLoading(false)
    setTimeout(() => router.push('/student/dashboard'), 2000)
  }

  return (
    <>
      <TopBar title="Choose Your Mess" back />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        {confirmed ? (
          <Alert variant="success">
            ✓ You're now subscribed to {mess.label}! Redirecting to your dashboard…
          </Alert>
        ) : (
          <>
            {/* Mess preview card */}
            <Card style={{
              background: `linear-gradient(135deg, var(--surface) 0%, ${
                messParam === 'mess_a' ? 'rgba(37,99,235,0.1)' : 'rgba(22,163,74,0.1)'
              } 100%)`,
              borderColor: messParam === 'mess_a' ? 'rgba(37,99,235,0.3)' : 'rgba(22,163,74,0.3)',
              textAlign: 'center', padding: '2rem 1.5rem',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{mess.emoji}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: mess.color,
                letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                {mess.label}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {mess.location}
              </div>
            </Card>

            {/* What this means */}
            <Card>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                What happens next
              </div>
              {[
                'Your subscription starts today and is valid for the rest of this academic year',
                'Scan the QR code at the mess entrance to authorize each meal',
                'You can request a mess change anytime — admin will review and approve',
              ].map((point, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.65rem',
                  alignItems: 'flex-start' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%',
                    background: mess.color, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700,
                    color: 'white', flexShrink: 0, marginTop: '0.05rem' }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                    {point}
                  </div>
                </div>
              ))}
            </Card>

            {/* Switch option */}
            <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Changed your mind?{' '}
              <button onClick={() => router.push(
                `/student/select-mess?mess=${messParam === 'mess_a' ? 'mess_b' : 'mess_a'}`
              )} style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', fontWeight: 600, fontSize: '0.82rem', padding: 0 }}>
                Switch to {messParam === 'mess_a' ? 'Mess B' : 'Mess A'}
              </button>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <Button fullWidth size="lg" loading={loading} onClick={handleConfirm}
              style={{ background: mess.color }}>
              Confirm — Join {mess.label}
            </Button>
          </>
        )}

      </div>
    </>
  )
}

export default function SelectMessPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>}>
      <SelectMessContent />
    </Suspense>
  )
}
