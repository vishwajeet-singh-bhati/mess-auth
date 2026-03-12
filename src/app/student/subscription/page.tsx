// app/(student)/subscription/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Card, Badge, Alert } from '@/components/shared/ui'
import type { MessId } from '@/types/database'

export const metadata = { title: 'My Subscription' }
export const dynamic = 'force-dynamic'

export default async function SubscriptionPage() {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()
  const today = dateToDateString(new Date())

  const { data: student } = await db
    .from('students')
    .select('id, roll_number, hostel_block, room_number, department, batch_year, phone')
    .eq('user_id', profile.id)
    .single()

  const { data: subscription } = await db
    .from('subscriptions')
    .select('id, mess_id, start_date, end_date, plan_name, monthly_fee, status')
    .eq('student_id', student?.id ?? '')
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
    .maybeSingle()

  const { data: pendingRequest } = await db
    .from('mess_change_requests')
    .select('id, to_mess_id, status, requested_at')
    .eq('student_id', student?.id ?? '')
    .eq('status', 'pending')
    .maybeSingle()

  const { data: pastSubs } = await db
    .from('subscriptions')
    .select('id, mess_id, start_date, end_date, status')
    .eq('student_id', student?.id ?? '')
    .neq('status', 'active')
    .order('end_date', { ascending: false })
    .limit(5)

  const messDisplay = subscription?.mess_id
    ? MESS_DISPLAY[subscription.mess_id as MessId]
    : null

  const daysLeft = subscription
    ? Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / 86400000)
    : 0

  return (
    <>
      <TopBar title="My Subscription" back />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        {/* Active subscription */}
        {subscription ? (
          <Card style={{
            background: `linear-gradient(135deg, var(--surface) 0%, ${
              subscription.mess_id === 'mess_a' ? 'rgba(59,130,246,0.07)' : 'rgba(139,92,246,0.07)'
            } 100%)`,
            borderColor: subscription.mess_id === 'mess_a' ? 'rgba(59,130,246,0.3)' : 'rgba(139,92,246,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Plan</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)',
                  letterSpacing: '-0.02em', marginTop: '0.2rem' }}>
                  {messDisplay?.label}
                </div>
              </div>
              <Badge variant="success">● Active</Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {[
                { label: 'Plan', value: subscription.plan_name ?? 'Standard' },
                { label: 'Fee', value: subscription.monthly_fee ? `₹${subscription.monthly_fee}/mo` : '—' },
                { label: 'From', value: new Date(subscription.start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                { label: 'Until', value: new Date(subscription.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(0,0,0,0.2)',
                  borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.15rem', fontWeight: 600 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {daysLeft < 14 && (
              <div style={{ marginTop: '0.75rem' }}>
                <Alert variant="warning">
                  ⚠ Your subscription expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}. Contact the hostel office to renew.
                </Alert>
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <EmptySubCard />
          </Card>
        )}

        {/* Pending change request */}
        {pendingRequest && (
          <Alert variant="info">
            <strong>Change request pending</strong> — You've requested to switch to {MESS_DISPLAY[pendingRequest.to_mess_id as MessId]?.label}.
            Submitted on {new Date(pendingRequest.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.
            Awaiting admin approval.
          </Alert>
        )}

        {/* Request change link */}
        {subscription && !pendingRequest && (
          <Link href="/student/change-request" style={{ textDecoration: 'none' }}>
            <Card hoverable style={{ padding: '0.9rem 1rem', display: 'flex',
              alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <span style={{ fontSize: '1.1rem' }}>⇄</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>Request Mess Change</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Switch to {subscription.mess_id === 'mess_a' ? 'Block B' : 'Block A'} for next cycle</div>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>→</span>
            </Card>
          </Link>
        )}

        {/* Student profile */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            Student Details
          </div>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {[
              { label: 'Name',     value: profile.full_name },
              { label: 'Roll No.', value: student?.roll_number ?? '—' },
              { label: 'Email',    value: profile.email },
              { label: 'Dept.',    value: student?.department ?? '—' },
              { label: 'Block',    value: student?.hostel_block ? `Block ${student.hostel_block}, Room ${student.room_number}` : '—' },
              { label: 'Batch',    value: student?.batch_year?.toString() ?? '—' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.7rem 1rem',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)',
                  maxWidth: '200px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </Card>
        </div>

        {/* Past subscriptions */}
        {(pastSubs?.length ?? 0) > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              Past Subscriptions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {pastSubs?.map(sub => (
                <Card key={sub.id} style={{ padding: '0.75rem 1rem', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                      {MESS_DISPLAY[sub.mess_id as MessId]?.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {new Date(sub.start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' – '}
                      {new Date(sub.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <Badge variant={sub.status === 'expired' ? 'default' : 'warning'} size="sm">
                    {sub.status}
                  </Badge>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}

function EmptySubCard() {
  return (
    <div style={{ textAlign: 'center', padding: '1.5rem' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem' }}>No Active Subscription</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        Contact the hostel office to register a mess subscription.
      </div>
    </div>
  )
}
