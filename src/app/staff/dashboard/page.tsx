// app/(staff)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MEAL_DISPLAY, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Card, Badge, StatCard } from '@/components/shared/ui'
import type { MealType, MessId } from '@/types/database'

export const metadata = { title: 'Staff Dashboard' }
export const dynamic = 'force-dynamic'

export default async function StaffDashboardPage() {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()

  // Get staff's assigned mess
  const { data: mapping } = await db
    .from('staff_mess_mapping')
    .select('mess_id')
    .eq('user_id', profile.id)
    .single()

  const messId = mapping?.mess_id as MessId | undefined
  const messDisplay = messId ? MESS_DISPLAY[messId] : null

  const today = dateToDateString(new Date())

  // Today's meal counts
  const { data: todayLogs } = await db
    .from('meal_logs')
    .select('meal_type, method, authorized_at')
    .eq('mess_id', messId ?? 'mess_a')
    .eq('meal_date', today)
    .order('authorized_at', { ascending: false })

  // Today's denied attempts
  const { data: deniedToday } = await db
    .from('authorization_attempts')
    .select('id')
    .eq('mess_id', messId ?? 'mess_a')
    .eq('was_successful', false)
    .gte('attempted_at', today + 'T00:00:00.000Z')

  // Recent authorization feed (last 20)
  const { data: recentFeed } = await db
    .from('v_today_authorizations')
    .select('*')
    .eq('mess_id', messId ?? 'mess_a')
    .order('attempted_at', { ascending: false })
    .limit(20)

  const totalToday = todayLogs?.length ?? 0
  const deniedCount = deniedToday?.length ?? 0

  const mealCounts = (todayLogs ?? []).reduce((acc, log) => {
    acc[log.meal_type as MealType] = (acc[log.meal_type as MealType] ?? 0) + 1
    return acc
  }, {} as Record<MealType, number>)

  const firstName = profile.full_name.split(' ')[0]

  return (
    <>
      <TopBar
        title={messDisplay ? `${messDisplay.label}` : 'Staff Dashboard'}
        subtitle={`Welcome, ${firstName}`}
        userName={profile.full_name}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>

        {!messId && (
          <div style={{ background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)',
            borderRadius: 'var(--radius-lg)', padding: '1rem', fontSize: '0.88rem', color: 'var(--yellow)' }}>
            ⚠ No mess assigned to your account. Contact admin.
          </div>
        )}

        {/* Quick verify CTA */}
        <Link href="/staff/verify" style={{ textDecoration: 'none' }}>
          <div style={{
            background:   'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
            border:       '1px solid var(--green-border)',
            borderRadius: 'var(--radius-lg)',
            padding:      '1.25rem',
            display:      'flex', alignItems: 'center', gap: '1rem',
            boxShadow:    '0 4px 24px rgba(34,197,94,0.15)',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: 'var(--radius-md)',
              background: 'rgba(34,197,94,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', flexShrink: 0,
            }}>✋</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#bbf7d0' }}>
                Manual Verification
              </div>
              <div style={{ fontSize: '0.8rem', color: '#86efac80', marginTop: '0.1rem' }}>
                Verify student by roll number
              </div>
            </div>
            <span style={{ color: '#86efac60', fontSize: '1.1rem' }}>→</span>
          </div>
        </Link>

        {/* Today's stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
          <StatCard label="Total Today" value={totalToday} icon="🍽"
            color="var(--accent)" />
          <StatCard label="Denied" value={deniedCount} icon="🚫"
            color="var(--red)" />
          <StatCard label="Manual" value={(todayLogs ?? []).filter(l => l.method === 'manual_staff').length}
            icon="✋" color="var(--yellow)" />
        </div>

        {/* Meal breakdown */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
            Today by Meal
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {(['breakfast','lunch','snacks','dinner'] as MealType[]).map(slot => {
              const count = mealCounts[slot] ?? 0
              const meta  = MEAL_DISPLAY[slot]
              return (
                <Card key={slot} style={{ padding: '0.75rem', display: 'flex',
                  alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{meta.emoji}</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: count > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
                      {count}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Live auth feed */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Recent Attempts
            </div>
            <Link href="/staff/denied" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>
              View denied →
            </Link>
          </div>

          {(recentFeed?.length ?? 0) === 0 ? (
            <Card style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No activity yet today.
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {recentFeed?.slice(0, 10).map(entry => (
                <div key={entry.id} style={{
                  background:   'var(--surface)',
                  border:       `1px solid ${entry.was_successful ? 'var(--green-border)' : 'var(--red-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding:      '0.7rem 1rem',
                  display:      'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <span style={{
                    fontSize: '1rem', flexShrink: 0,
                    color: entry.was_successful ? 'var(--green)' : 'var(--red)',
                  }}>
                    {entry.was_successful ? '✓' : '✗'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.student_name ?? entry.roll_number ?? 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
                      {entry.roll_number}
                      {entry.meal_type && ` · ${MEAL_DISPLAY[entry.meal_type as MealType]?.label}`}
                      {!entry.was_successful && entry.denial_reason && ` · ${entry.denial_reason.replace(/_/g, ' ')}`}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {new Date(entry.attempted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  )
}
