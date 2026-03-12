// app/(admin)/requests/page.tsx
import { redirect } from 'next/navigation'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Badge, EmptyState } from '@/components/shared/ui'
import { RequestActions } from './RequestActions'
import type { MessId } from '@/types/database'

export const metadata = { title: 'Change Requests' }
export const dynamic = 'force-dynamic'

export default async function AdminRequestsPage() {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()

  const { data: requests } = await db
    .from('mess_change_requests')
    .select(`
      id, status, reason, requested_at, review_note, effective_date,
      from_mess_id, to_mess_id,
      students (
        roll_number,
        users ( full_name, email )
      )
    `)
    .order('requested_at', { ascending: false })
    .limit(100)

  const pending  = requests?.filter(r => r.status === 'pending') ?? []
  const reviewed = requests?.filter(r => r.status !== 'pending') ?? []

  const STATUS_BADGE: Record<string, any> = {
    pending:  'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled:'default',
  }

  const RequestCard = ({ req }: { req: typeof requests[0] }) => {
    const stu = (req as any).students
    const user = stu?.users

    return (
      <div style={{
        background:   'var(--surface)',
        border:       `1px solid ${req.status === 'pending' ? 'var(--yellow-border)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding:      '1rem',
        display:      'flex', flexDirection: 'column', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
              {user?.full_name ?? '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {stu?.roll_number}
            </div>
          </div>
          <Badge variant={STATUS_BADGE[req.status] ?? 'default'} size="sm">
            {req.status}
          </Badge>
        </div>

        {/* Change direction */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            flex: 1, background: 'var(--surface-high)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', textAlign: 'center',
            fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)',
          }}>
            {MESS_DISPLAY[req.from_mess_id as MessId]?.short}
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>→</span>
          <div style={{
            flex: 1, background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', textAlign: 'center',
            fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)',
          }}>
            {MESS_DISPLAY[req.to_mess_id as MessId]?.short}
          </div>
        </div>

        {req.reason && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            "{req.reason}"
          </div>
        )}

        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          Requested {new Date(req.requested_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </div>

        {req.review_note && (
          <div style={{
            background: 'var(--surface-high)', borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-dim)',
          }}>
            Review note: {req.review_note}
          </div>
        )}

        {req.status === 'pending' && (
          <RequestActions
            requestId={req.id}
            adminId={profile.id}
            studentId={(req as any).students?.id}
            toMessId={req.to_mess_id as MessId}
            fromMessId={req.from_mess_id as MessId}
          />
        )}
      </div>
    )
  }

  return (
    <>
      <TopBar
        title="Change Requests"
        subtitle={`${pending.length} pending`}
        back
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        {pending.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--yellow)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
              Pending ({pending.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pending.map(req => <RequestCard key={req.id} req={req} />)}
            </div>
          </div>
        )}

        {reviewed.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
              Reviewed
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {reviewed.map(req => <RequestCard key={req.id} req={req} />)}
            </div>
          </div>
        )}

        {(requests?.length ?? 0) === 0 && (
          <EmptyState icon="⇄" title="No change requests" subtitle="Student mess change requests will appear here." />
        )}

      </div>
    </>
  )
}
