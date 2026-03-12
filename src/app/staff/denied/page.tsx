// app/(staff)/denied/page.tsx
import { redirect } from 'next/navigation'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MEAL_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Card, Badge, EmptyState } from '@/components/shared/ui'
import type { MealType, MessId, DenialReason } from '@/types/database'

export const metadata = { title: 'Denied Attempts' }
export const dynamic = 'force-dynamic'

const REASON_COLOR: Record<string, string> = {
  wrong_mess:         'var(--red)',
  already_consumed:   'var(--yellow)',
  outside_meal_hours: 'var(--yellow)',
  blocked_student:    'var(--red)',
  expired_qr:         'var(--text-muted)',
  invalid_qr:         'var(--text-muted)',
  no_subscription:    'var(--red)',
  qr_already_used:    'var(--text-muted)',
  student_not_found:  'var(--red)',
}

export default async function DeniedPage() {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()

  const { data: mapping } = await db
    .from('staff_mess_mapping')
    .select('mess_id')
    .eq('user_id', profile.id)
    .single()

  const messId = (mapping?.mess_id ?? 'mess_a') as MessId
  const today = dateToDateString(new Date())

  const { data: denied } = await db
    .from('authorization_attempts')
    .select(`
      id, attempted_at, denial_reason, meal_type, method, roll_number,
      students ( roll_number, users ( full_name ) )
    `)
    .eq('mess_id', messId)
    .eq('was_successful', false)
    .gte('attempted_at', today + 'T00:00:00.000Z')
    .order('attempted_at', { ascending: false })
    .limit(100)

  // Group by reason for summary
  const byCause = (denied ?? []).reduce((acc, d) => {
    const r = d.denial_reason ?? 'unknown'
    acc[r] = (acc[r] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <>
      <TopBar
        title="Denied Attempts"
        subtitle={`Today · ${denied?.length ?? 0} total`}
        back
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        {/* Summary by reason */}
        {Object.keys(byCause).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {Object.entries(byCause).sort((a,b) => b[1]-a[1]).map(([reason, count]) => (
              <div key={reason} style={{
                background:   'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '0.35rem 0.75rem',
                fontSize:     '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}>
                <span style={{ color: REASON_COLOR[reason] ?? 'var(--text-muted)', fontWeight: 700 }}>
                  {count}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {reason.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {(denied?.length ?? 0) === 0 ? (
          <EmptyState icon="✓" title="No denied attempts today" subtitle="All authorization attempts have been successful." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {denied?.map(entry => {
              const stu = (entry.students as any)
              const name = stu?.users?.full_name
              const roll = stu?.roll_number ?? entry.roll_number ?? '—'
              const color = REASON_COLOR[entry.denial_reason ?? ''] ?? 'var(--text-muted)'

              return (
                <div key={entry.id} style={{
                  background:   'var(--surface)',
                  border:       '1px solid var(--red-border)',
                  borderRadius: 'var(--radius-md)',
                  padding:      '0.75rem 1rem',
                  display:      'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <span style={{ color: 'var(--red)', fontSize: '1rem', flexShrink: 0 }}>✗</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name ?? roll}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.68rem', color, fontWeight: 700 }}>
                        {entry.denial_reason?.replace(/_/g, ' ')}
                      </span>
                      {entry.meal_type && (
                        <>
                          <span style={{ color: 'var(--border)' }}>·</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {MEAL_DISPLAY[entry.meal_type as MealType]?.label}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {new Date(entry.attempted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {entry.method === 'qr_scan' ? '📷' : '✋'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </>
  )
}
