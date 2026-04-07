// app/student/dashboard/page.tsx — Brutalist Dark

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MEAL_DISPLAY, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import type { MealType, MessId } from '@/types/database'

export const metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function StudentDashboardPage() {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()
  const today = dateToDateString(new Date())

  const { data: student } = await db
    .from('students')
    .select('id, roll_number, hostel_block, room_number, is_blocked')
    .eq('user_id', profile.id)
    .single()

  const { data: subscription } = await db
    .from('subscriptions')
    .select('id, mess_id, start_date, end_date, plan_name')
    .eq('student_id', student?.id ?? '')
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
    .maybeSingle()

  const { data: todayMeals } = await db
    .from('meal_logs')
    .select('meal_type, authorized_at, method')
    .eq('student_id', student?.id ?? '')
    .eq('meal_date', today)
    .order('authorized_at', { ascending: true })

  const { data: pendingRequest } = await db
    .from('mess_change_requests')
    .select('id, to_mess_id, status, requested_at')
    .eq('student_id', student?.id ?? '')
    .eq('status', 'pending')
    .maybeSingle()

  const messDisplay = subscription?.mess_id
    ? MESS_DISPLAY[subscription.mess_id as MessId]
    : null

  const daysLeft = subscription
    ? Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / 86400000)
    : 0

  const mealOrder: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner']
  const consumedSlots = new Set((todayMeals ?? []).map(m => m.meal_type))
  const firstName = profile.full_name.split(' ')[0]
  const consumedCount = consumedSlots.size

  return (
    <>
      <TopBar
        title={`${firstName}`}
        subtitle={student?.roll_number}
        userName={profile.full_name}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', paddingTop: '0' }}>

        {/* Blocked warning */}
        {student?.is_blocked && (
          <div style={{
            background: '#111', borderBottom: '1px solid #2e2e2e',
            padding: '1rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{ fontSize: '0.88rem', color: '#ccc', fontWeight: 600 }}>Account Blocked</div>
            <div style={{ fontSize: '0.78rem', color: '#666' }}>Contact the hostel office.</div>
          </div>
        )}

        {/* No subscription */}
        {!subscription && (
          <div style={{ padding: '2rem 1rem', borderBottom: '1px solid #111' }}>
            <div style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: '1.5rem', color: '#fff', marginBottom: '0.5rem',
            }}>
              No mess selected
            </div>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Choose a mess to start authorizing meals.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {(['mess_a', 'mess_b'] as const).map(messId => (
                <Link key={messId} href={`/student/select-mess?mess=${messId}`}
                  style={{ textDecoration: 'none', flex: 1 }}>
                  <div style={{
                    background: '#111', border: '1px solid #2e2e2e',
                    borderRadius: '8px', padding: '1rem',
                    textAlign: 'center', transition: 'border-color 0.15s',
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff',
                      fontFamily: "'DM Serif Display', Georgia, serif" }}>
                      {messId === 'mess_a' ? 'Mess A' : 'Mess B'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '0.25rem' }}>
                      Select
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Subscription block */}
        {subscription && (
          <div style={{
            background: '#fff', padding: '1.5rem 1rem',
          }}>
            <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.5rem' }}>
              Active Subscription
            </div>
            <div style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: '2.2rem', color: '#000', letterSpacing: '-0.02em',
              lineHeight: 1, marginBottom: '1rem',
            }}>
              {messDisplay?.label}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em',
                  textTransform: 'uppercase', marginBottom: '0.2rem' }}>Valid Until</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#000' }}>
                  {new Date(subscription.end_date).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em',
                  textTransform: 'uppercase', marginBottom: '0.2rem' }}>Days Left</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600,
                  color: daysLeft < 7 ? '#555' : '#000' }}>
                  {daysLeft}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '0.08em',
                  textTransform: 'uppercase', marginBottom: '0.2rem' }}>Today</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#000' }}>
                  {consumedCount}/4 meals
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending request notice */}
        {pendingRequest && (
          <div style={{ background: '#0a0a0a', borderBottom: '1px solid #1e1e1e',
            padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ccc' }}>
                Mess change pending
              </div>
              <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '0.1rem' }}>
                Requested {MESS_DISPLAY[pendingRequest.to_mess_id as MessId]?.label} — awaiting approval
              </div>
            </div>
          </div>
        )}

        {/* Scan CTA */}
        {subscription && !student?.is_blocked && (
          <Link href="/student/scan" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              background: '#111', borderBottom: '1px solid #1e1e1e',
              padding: '1rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
              transition: 'background 0.15s',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '8px',
                background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                  Scan Mess QR
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.1rem' }}>
                  Tap to authorize meal entry
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#333" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </Link>
        )}

        {/* Today's meals */}
        {subscription && (
          <div style={{ background: '#0a0a0a', padding: '1rem' }}>
            <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.85rem' }}>
              Today's meals
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {mealOrder.map(slot => {
                const consumed = consumedSlots.has(slot)
                const meta = MEAL_DISPLAY[slot]
                return (
                  <div key={slot} style={{
                    background: consumed ? '#1a1a1a' : '#111',
                    border: `1px solid ${consumed ? '#fff' : '#1e1e1e'}`,
                    borderRadius: '8px', padding: '0.85rem',
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600,
                        color: consumed ? '#fff' : '#555' }}>
                        {meta.label}
                      </div>
                      <div style={{ fontSize: '0.68rem', marginTop: '0.15rem',
                        color: consumed ? '#888' : '#333',
                        fontFamily: "'JetBrains Mono', monospace" }}>
                        {consumed ? 'done' : '—'}
                      </div>
                    </div>
                    {consumed && (
                      <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>✓</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ background: '#0a0a0a', padding: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.35rem' }}>
            Actions
          </div>
          {[
            { href: '/student/history', label: 'View Meal History', sub: 'See all past meals', show: true },
            { href: '/student/change-request', label: 'Request Mess Change', sub: 'Switch to another mess',
              show: !!subscription && !pendingRequest },
          ].filter(i => i.show).map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#111', border: '1px solid #1e1e1e',
                borderRadius: '8px', padding: '0.9rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                transition: 'border-color 0.15s',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ccc' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '0.1rem' }}>
                    {item.sub}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#333" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </>
  )
}