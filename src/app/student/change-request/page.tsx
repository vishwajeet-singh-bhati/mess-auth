'use client'
// app/(student)/change-request/page.tsx

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/shared/TopBar'
import { Button, Alert, Card, Badge } from '@/components/shared/ui'
import { MESS_DISPLAY } from '@/lib/meal/slots'
import type { MessId } from '@/types/database'

export default function ChangeRequestPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason]     = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  const [currentSub, setCurrentSub] = useState<{ mess_id: MessId; end_date: string } | null>(null)
  const [pendingReq, setPendingReq] = useState<any | null>(null)
  const [studentId, setStudentId]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const today = new Date().toISOString().split('T')[0]

      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)    // Note: needs user_id from public.users join — use RPC or fetch profile first
        .maybeSingle()

      // Simpler: fetch via profile
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (!profile) return

      const { data: stu } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', profile.id)
        .single()

      if (!stu) { setLoading(false); return }
      setStudentId(stu.id)

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('mess_id, end_date')
        .eq('student_id', stu.id)
        .eq('status', 'active')
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle()

      setCurrentSub(sub as any)

      const { data: pending } = await supabase
        .from('mess_change_requests')
        .select('id, to_mess_id, status, requested_at, review_note')
        .eq('student_id', stu.id)
        .order('requested_at', { ascending: false })
        .limit(3)

      setPendingReq(pending?.[0] ?? null)
      setLoading(false)
    }
    load()
  }, [])

  const targetMess = currentSub
    ? (currentSub.mess_id === 'mess_a' ? 'mess_b' : 'mess_a') as MessId
    : null

  const handleSubmit = async () => {
    if (!studentId || !currentSub || !targetMess) return
    if (!reason.trim()) { setError('Please provide a reason for the change request.'); return }

    setSubmitting(true)
    setError(null)

    const { error: insertError } = await supabase.from('mess_change_requests').insert({
      student_id:  studentId,
      from_mess_id: currentSub.mess_id,
      to_mess_id:   targetMess,
      reason:       reason.trim(),
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
    setTimeout(() => router.push('/student/subscription'), 2500)
  }

  if (loading) {
    return (
      <>
        <TopBar title="Change Mess" back />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid transparent',
            borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Request Mess Change" back />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        {success && (
          <Alert variant="success">
            ✓ Request submitted successfully! You'll be notified once the admin reviews it.
          </Alert>
        )}

        {!currentSub ? (
          <Alert variant="error">You don't have an active subscription to request a change for.</Alert>
        ) : pendingReq?.status === 'pending' ? (
          <>
            <Alert variant="info">
              You already have a pending change request. You can submit a new one once it's reviewed.
            </Alert>
            <RecentRequests requests={[pendingReq]} />
          </>
        ) : (
          <>
            {/* Change summary */}
            <Card>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                Requested Change
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1, background: 'var(--surface-high)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>FROM</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.88rem' }}>
                    {MESS_DISPLAY[currentSub.mess_id as MessId]?.label}
                  </div>
                </div>
                <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>→</span>
                <div style={{ flex: 1, background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: 'var(--radius-md)', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>TO</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.88rem' }}>
                    {MESS_DISPLAY[targetMess!]?.label}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Change takes effect from the next billing cycle. Your current subscription remains active until{' '}
                <strong style={{ color: 'var(--text-dim)' }}>
                  {new Date(currentSub.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </strong>.
              </div>
            </Card>

            {/* Reason */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: '0.5rem' }}>
                Reason for change <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Briefly explain why you'd like to switch mess..."
                maxLength={500}
                rows={4}
                style={{
                  width:        '100%',
                  padding:      '0.75rem 1rem',
                  background:   'var(--surface)',
                  border:       '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color:        'var(--text)',
                  fontSize:     '0.9rem',
                  outline:      'none',
                  resize:       'vertical',
                  fontFamily:   'inherit',
                  lineHeight:   1.5,
                  boxSizing:    'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Min. 10 characters</span>
                <span style={{ fontSize: '0.75rem', color: reason.length > 450 ? 'var(--yellow)' : 'var(--text-muted)' }}>
                  {reason.length}/500
                </span>
              </div>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <Button
              fullWidth
              size="lg"
              loading={submitting}
              disabled={reason.trim().length < 10}
              onClick={handleSubmit}
            >
              Submit Change Request
            </Button>

            {pendingReq && <RecentRequests requests={[pendingReq]} />}
          </>
        )}
      </div>
    </>
  )
}

function RecentRequests({ requests }: { requests: any[] }) {
  const STATUS_BADGE: Record<string, any> = {
    pending:  'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled:'default',
  }

  return (
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
        Recent Requests
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {requests.map(req => (
          <Card key={req.id} style={{ padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: req.review_note ? '0.5rem' : 0 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>
                  → {MESS_DISPLAY[req.to_mess_id as MessId]?.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {new Date(req.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <Badge variant={STATUS_BADGE[req.status] ?? 'default'} size="sm">
                {req.status}
              </Badge>
            </div>
            {req.review_note && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', background: 'var(--surface-high)',
                borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', marginTop: '0.4rem' }}>
                Note: {req.review_note}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
