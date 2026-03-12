// app/(admin)/reports/page.tsx
import { redirect } from 'next/navigation'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MEAL_DISPLAY, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Card, StatCard, Badge } from '@/components/shared/ui'
import { ExportButton } from './ExportButton'
import type { MealType, MessId } from '@/types/database'

export const metadata = { title: 'Reports' }
export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()

  // Last 7 days daily summary
  const { data: weeklySummary } = await db
    .from('v_daily_meal_summary')
    .select('*')
    .gte('meal_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
    .order('meal_date', { ascending: false })

  // Top denial reasons (last 7 days)
  const { data: denials } = await db
    .from('authorization_attempts')
    .select('denial_reason')
    .eq('was_successful', false)
    .gte('attempted_at', new Date(Date.now() - 7 * 86400000).toISOString())

  const denialCounts = (denials ?? []).reduce((acc, d) => {
    const r = d.denial_reason ?? 'unknown'
    acc[r] = (acc[r] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Subscription distribution
  const { data: subDist } = await db
    .from('subscriptions')
    .select('mess_id')
    .eq('status', 'active')

  const messACount = subDist?.filter(s => s.mess_id === 'mess_a').length ?? 0
  const messBCount = subDist?.filter(s => s.mess_id === 'mess_b').length ?? 0

  // Group weekly summary by date
  const byDate = new Map<string, typeof weeklySummary>()
  for (const row of weeklySummary ?? []) {
    const existing = byDate.get(row.meal_date) ?? []
    existing.push(row)
    byDate.set(row.meal_date, existing)
  }

  const dates = Array.from(byDate.keys()).sort((a,b) => b.localeCompare(a))

  return (
    <>
      <TopBar title="Reports" back subtitle="Last 7 days" action={<ExportButton />} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '0.75rem' }}>

        {/* Subscription distribution */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
            Subscription Distribution
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <Card style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                Block A Mess
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent)' }}>{messACount}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>active subscribers</div>
            </Card>
            <Card style={{ borderColor: 'rgba(139,92,246,0.3)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--purple)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                Block B Mess
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--purple)' }}>{messBCount}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>active subscribers</div>
            </Card>
          </div>
        </div>

        {/* Top denial reasons */}
        {Object.keys(denialCounts).length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
              Denial Reasons (7d)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {Object.entries(denialCounts).sort((a,b) => b[1]-a[1]).map(([reason, count]) => {
                const total = Object.values(denialCounts).reduce((a,b) => a+b, 0)
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={reason} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', padding: '0.7rem 0.9rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600,
                        textTransform: 'capitalize' }}>
                        {reason.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--red)' }}>
                        {count} <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--surface-high)',
                      borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--red)',
                        borderRadius: '99px', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Daily meal breakdown */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
            Daily Breakdown (7d)
          </div>
          {dates.map(date => {
            const rows = byDate.get(date) ?? []
            const total = rows.reduce((a, r) => a + (r.total_meals ?? 0), 0)
            const isToday = date === new Date().toISOString().split('T')[0]

            return (
              <div key={date} style={{ marginBottom: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',
                  marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800,
                    color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'short', day: 'numeric', month: 'short'
                    })}
                  </span>
                  {isToday && <Badge variant="info" size="sm">Today</Badge>}
                  <span style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 800,
                    color: 'var(--text)' }}>
                    {total} total
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {rows.map(row => (
                    <div key={`${row.mess_id}-${row.meal_type}`} style={{
                      display:      'flex', alignItems: 'center', gap: '0.5rem',
                      padding:      '0.5rem 0.75rem',
                      background:   'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>
                        {MEAL_DISPLAY[row.meal_type as MealType]?.emoji}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', flex: 1 }}>
                        {MEAL_DISPLAY[row.meal_type as MealType]?.label}
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                          · {MESS_DISPLAY[row.mess_id as MessId]?.short}
                        </span>
                      </span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)' }}>
                        {row.total_meals}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {dates.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No meal data in the last 7 days.
            </div>
          )}
        </div>

      </div>
    </>
  )
}
