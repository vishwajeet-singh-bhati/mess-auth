// app/(staff)/summary/page.tsx
import { redirect } from 'next/navigation'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MEAL_DISPLAY, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Card, StatCard, Badge } from '@/components/shared/ui'
import type { MealType, MessId } from '@/types/database'

export const metadata = { title: "Today's Summary" }
export const dynamic = 'force-dynamic'

export default async function StaffSummaryPage() {
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

  const { data: logs } = await db
    .from('meal_logs')
    .select('meal_type, method, authorized_at, students(roll_number, users(full_name))')
    .eq('mess_id', messId)
    .eq('meal_date', today)
    .order('authorized_at', { ascending: false })

  const mealOrder: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner']

  const byMeal = mealOrder.reduce((acc, m) => {
    acc[m] = (logs ?? []).filter(l => l.meal_type === m)
    return acc
  }, {} as Record<MealType, typeof logs>)

  return (
    <>
      <TopBar
        title="Today's Summary"
        subtitle={`${MESS_DISPLAY[messId]?.label} · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`}
        back
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <StatCard label="Total Meals" value={logs?.length ?? 0} icon="🍽" color="var(--accent)" />
          <StatCard label="QR Scans" value={(logs ?? []).filter(l => l.method === 'qr_scan').length} icon="📷" color="var(--green)" />
        </div>

        {mealOrder.map(slot => {
          const slotLogs = byMeal[slot] ?? []
          const meta = MEAL_DISPLAY[slot]
          if (slotLogs.length === 0) return null

          return (
            <div key={slot}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>{meta.emoji}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {meta.label}
                </span>
                <Badge variant="info" size="sm">{slotLogs.length}</Badge>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {slotLogs.map((log, i) => {
                  const stu = (log.students as any)
                  const user = stu?.users
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 0.9rem',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user?.full_name ?? '—'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {stu?.roll_number}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {new Date(log.authorized_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: log.method === 'qr_scan' ? 'var(--green)' : 'var(--yellow)', marginTop: '0.05rem' }}>
                          {log.method === 'qr_scan' ? '📷' : '✋'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {(logs?.length ?? 0) === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No meals authorized yet today.
          </div>
        )}

      </div>
    </>
  )
}
