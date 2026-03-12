// app/(student)/history/page.tsx
import { redirect } from 'next/navigation'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TopBar } from '@/components/shared/TopBar'
import { Badge, EmptyState } from '@/components/shared/ui'
import { MEAL_DISPLAY, MESS_DISPLAY } from '@/lib/meal/slots'
import type { MealType, MessId } from '@/types/database'

export const metadata = { title: 'Meal History' }
export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()

  const { data: student } = await db
    .from('students')
    .select('id')
    .eq('user_id', profile.id)
    .single()

  const { data: logs } = await db
    .from('meal_logs')
    .select(`
      id, meal_date, meal_type, mess_id,
      authorized_at, method,
      messes ( name )
    `)
    .eq('student_id', student?.id ?? '')
    .order('authorized_at', { ascending: false })
    .limit(90)

  // Group by date
  const byDate = new Map<string, typeof logs>()
  for (const log of logs ?? []) {
    const existing = byDate.get(log.meal_date) ?? []
    existing.push(log)
    byDate.set(log.meal_date, existing)
  }

  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a))

  const totalMeals   = logs?.length ?? 0
  const qrMeals      = logs?.filter(l => l.method === 'qr_scan').length ?? 0
  const manualMeals  = logs?.filter(l => l.method === 'manual_staff').length ?? 0

  return (
    <>
      <TopBar title="Meal History" back subtitle={`${totalMeals} meals recorded`} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
          {[
            { label: 'Total', value: totalMeals, color: 'var(--accent)' },
            { label: 'QR Scan', value: qrMeals, color: 'var(--green)' },
            { label: 'Manual', value: manualMeals, color: 'var(--yellow)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '0.75rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* History list */}
        {sortedDates.length === 0 ? (
          <EmptyState icon="🍽" title="No meals recorded" subtitle="Your meal history will appear here after your first authorized meal." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {sortedDates.map(date => {
              const dateLogs = byDate.get(date) ?? []
              const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
              })
              const isToday = date === new Date().toISOString().split('T')[0]

              return (
                <div key={date}>
                  <div style={{
                    fontSize: '0.7rem', fontWeight: 800, color: isToday ? 'var(--accent)' : 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    {displayDate}
                    {isToday && <Badge variant="info" size="sm">Today</Badge>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {dateLogs.map(log => {
                      const meal = MEAL_DISPLAY[log.meal_type as MealType]
                      const mess = MESS_DISPLAY[log.mess_id as MessId]
                      return (
                        <div key={log.id} style={{
                          background:   'var(--surface)',
                          border:       '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding:      '0.75rem 1rem',
                          display:      'flex', alignItems: 'center', gap: '0.75rem',
                        }}>
                          <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{meal.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.88rem' }}>
                              {meal.label}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                              {mess.label}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--green)' }}>
                              {new Date(log.authorized_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                              {log.method === 'qr_scan' ? '📷 QR' : '✋ Manual'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
