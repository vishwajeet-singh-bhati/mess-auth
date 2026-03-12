// app/(admin)/subscriptions/page.tsx
import { redirect } from 'next/navigation'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Badge, EmptyState, Card } from '@/components/shared/ui'
import { SubscriptionActions } from './SubscriptionActions'
import type { MessId, SubscriptionStatus } from '@/types/database'

export const metadata = { title: 'Subscriptions' }
export const dynamic = 'force-dynamic'

const STATUS_BADGE: Record<SubscriptionStatus, { variant: any; label: string }> = {
  active:    { variant: 'success', label: 'Active' },
  inactive:  { variant: 'default', label: 'Inactive' },
  suspended: { variant: 'warning', label: 'Suspended' },
  pending:   { variant: 'warning', label: 'Pending' },
  expired:   { variant: 'danger',  label: 'Expired' },
}

export default async function AdminSubscriptionsPage() {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()
  const today = dateToDateString(new Date())

  const { data: subscriptions } = await db
    .from('subscriptions')
    .select(`
      id, mess_id, status, start_date, end_date, plan_name, monthly_fee, created_at,
      students (
        id, roll_number,
        users ( full_name, email )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  // Summary counts
  const active    = subscriptions?.filter(s => s.status === 'active').length ?? 0
  const messA     = subscriptions?.filter(s => s.status === 'active' && s.mess_id === 'mess_a').length ?? 0
  const messB     = subscriptions?.filter(s => s.status === 'active' && s.mess_id === 'mess_b').length ?? 0
  const expiring  = subscriptions?.filter(s => {
    if (s.status !== 'active') return false
    const daysLeft = Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86400000)
    return daysLeft <= 30
  }).length ?? 0

  return (
    <>
      <TopBar
        title="Subscriptions"
        subtitle={`${subscriptions?.length ?? 0} total · ${active} active`}
        back
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
          {[
            { label: 'Active',     value: active,   color: 'var(--green)' },
            { label: 'Block A',    value: messA,    color: 'var(--accent)' },
            { label: 'Block B',    value: messB,    color: 'var(--purple)' },
            { label: 'Exp. Soon',  value: expiring, color: 'var(--yellow)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '0.6rem 0.5rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.1rem' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Add subscription CTA */}
        <SubscriptionActions adminId={profile.id} mode="create" />

        {/* List */}
        {(subscriptions?.length ?? 0) === 0 ? (
          <EmptyState icon="📋" title="No subscriptions" subtitle="Create subscriptions for students to enable mess access." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {subscriptions?.map(sub => {
              const stu  = (sub.students as any)
              const user = stu?.users
              const daysLeft = Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86400000)
              const isExpiring = sub.status === 'active' && daysLeft <= 30
              const statusMeta = STATUS_BADGE[sub.status as SubscriptionStatus] ?? STATUS_BADGE.inactive

              return (
                <div key={sub.id} style={{
                  background:   'var(--surface)',
                  border:       `1px solid ${isExpiring ? 'var(--yellow-border)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding:      '1rem',
                }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.full_name ?? '—'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)',
                        fontFamily: 'monospace', marginTop: '0.1rem' }}>
                        {stu?.roll_number}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0, marginLeft: '0.5rem', flexWrap: 'wrap' }}>
                      <Badge variant={statusMeta.variant} size="sm">{statusMeta.label}</Badge>
                      <Badge variant={sub.mess_id === 'mess_a' ? 'info' : 'purple'} size="sm">
                        {MESS_DISPLAY[sub.mess_id as MessId]?.short}
                      </Badge>
                    </div>
                  </div>

                  {/* Details row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem',
                    marginBottom: '0.75rem' }}>
                    {[
                      { label: 'FROM',    value: new Date(sub.start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
                      { label: 'UNTIL',   value: new Date(sub.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) },
                      { label: 'LEFT',    value: sub.status === 'active' ? `${Math.max(0, daysLeft)}d` : '—',
                        color: isExpiring ? 'var(--yellow)' : 'var(--text)' },
                    ].map(d => (
                      <div key={d.label} style={{
                        background: 'var(--surface-high)', borderRadius: 'var(--radius-sm)',
                        padding: '0.4rem 0.5rem',
                      }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)',
                          textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                          {d.label}
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700,
                          color: (d as any).color ?? 'var(--text)', marginTop: '0.1rem' }}>
                          {d.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <SubscriptionActions
                    adminId={profile.id}
                    mode="manage"
                    subscription={{
                      id:         sub.id,
                      studentId:  stu?.id,
                      status:     sub.status as SubscriptionStatus,
                      messId:     sub.mess_id as MessId,
                      endDate:    sub.end_date,
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}

      </div>
    </>
  )
}
