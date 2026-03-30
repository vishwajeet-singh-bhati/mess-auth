// app/student/dashboard/page.tsx — Premium Dark Redesign

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MEAL_DISPLAY, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Card, Badge } from '@/components/shared/ui'
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

  const mealIcons: Record<MealType, string> = {
    breakfast: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
    lunch: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    snacks: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.636-6.364l.707.707M12 21v-1m0-16a7 7 0 017 7h-1a6 6 0 10-12 0H5a7 7 0 017-7z',
    dinner: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  }

  return (
    <>
      <TopBar
        title={`Hey, ${firstName}`}
        subtitle={student?.roll_number}
        userName={profile.full_name}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.75rem' }}>

        {/* Blocked warning */}
        {student?.is_blocked && (
          <div style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: '12px', padding: '1rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(248,113,113,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', flexShrink: 0,
            }}>🔒</div>
            <div>
              <div style={{ fontWeight: 700, color: '#f87171', fontSize: '0.88rem' }}>Account Blocked</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(248,113,113,0.6)', marginTop: '0.1rem' }}>
                Contact the hostel office to resolve this.
              </div>
            </div>
          </div>
        )}

        {/* ── NO SUBSCRIPTION ── */}
        {!subscription && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '2rem 1.5rem',
            textAlign: 'center',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', margin: '0 auto 1rem',
            }}>🍽️</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: '1rem', color: '#f0f2f8', marginBottom: '0.4rem' }}>
              No mess selected yet
            </div>
            <div style={{ fontSize: '0.82rem', color: '#5a647a',
              marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Choose your mess to start authorizing meals
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              {(['mess_a', 'mess_b'] as const).map(messId => {
                const isA = messId === 'mess_a'
                const color = isA ? '#6366f1' : '#34d399'
                return (
                  <Link key={messId} href={`/student/select-mess?mess=${messId}`}
                    style={{ textDecoration: 'none', flex: 1, maxWidth: '150px' }}>
                    <div style={{
                      background: `${color}10`,
                      border: `1px solid ${color}25`,
                      borderRadius: '12px', padding: '1rem 0.75rem',
                      textAlign: 'center', transition: 'border-color 0.2s',
                    }}>
                      <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>
                        {isA ? '🔵' : '🟢'}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color,
                        fontFamily: "'Syne', sans-serif" }}>
                        {isA ? 'Mess A' : 'Mess B'}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── SUBSCRIPTION CARD ── */}
        {subscription && (
          <div style={{
            background: subscription.mess_id === 'mess_a'
              ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.03) 100%)'
              : 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(167,139,250,0.03) 100%)',
            border: subscription.mess_id === 'mess_a'
              ? '1px solid rgba(99,102,241,0.2)'
              : '1px solid rgba(167,139,250,0.2)',
            borderRadius: '16px', padding: '1.25rem',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Glow orb */}
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '100px', height: '100px', borderRadius: '50%',
              background: subscription.mess_id === 'mess_a' ? '#6366f1' : '#a78bfa',
              opacity: 0.08, filter: 'blur(30px)', pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#5a647a',
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
                  Active Subscription
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.4rem',
                  fontWeight: 800, color: '#f0f2f8', letterSpacing: '-0.02em' }}>
                  {messDisplay?.label}
                </div>
              </div>
              <Badge variant={subscription.mess_id === 'mess_a' ? 'info' : 'purple'}>
                {messDisplay?.short}
              </Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
              {[
                {
                  label: 'VALID UNTIL',
                  value: new Date(subscription.end_date).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  }),
                  warn: false,
                },
                {
                  label: 'DAYS LEFT',
                  value: `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`,
                  warn: daysLeft < 7,
                },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.65rem 0.8rem',
                }}>
                  <div style={{ fontSize: '0.62rem', color: '#5a647a', marginBottom: '0.2rem',
                    letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700,
                    color: item.warn ? '#fbbf24' : '#f0f2f8',
                    fontFamily: item.warn ? "'Syne', sans-serif" : 'inherit' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Meal progress bar */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.65rem', color: '#5a647a',
                  textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Today's meals
                </span>
                <span style={{ fontSize: '0.72rem', color: '#a8b0c8',
                  fontFamily: "'JetBrains Mono', monospace" }}>
                  {consumedCount}/4
                </span>
              </div>
              <div style={{
                height: '4px', background: 'rgba(255,255,255,0.06)',
                borderRadius: '99px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: '99px',
                  width: `${(consumedCount / 4) * 100}%`,
                  background: consumedCount === 4
                    ? '#34d399'
                    : subscription.mess_id === 'mess_a' ? '#6366f1' : '#a78bfa',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Pending change request */}
        {pendingRequest && (
          <div style={{
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: '12px', padding: '0.85rem 1rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1rem' }}>⏳</span>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fbbf24' }}>
                Mess change pending
              </div>
              <div style={{ fontSize: '0.72rem', color: '#5a647a', marginTop: '0.1rem' }}>
                Requested {MESS_DISPLAY[pendingRequest.to_mess_id as MessId]?.label} — awaiting approval
              </div>
            </div>
          </div>
        )}

        {/* Scan CTA */}
        {subscription && !student?.is_blocked && (
          <Link href="/student/scan" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              borderRadius: '16px', padding: '1.1rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
              border: '1px solid rgba(99,102,241,0.4)',
              boxShadow: '0 4px 24px rgba(99,102,241,0.25)',
              transition: 'transform 0.15s',
            }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700,
                  fontSize: '1rem', color: 'white' }}>Scan Mess QR</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.1rem' }}>
                  Tap to authorize meal entry
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </Link>
        )}

        {/* Today's meals */}
        {subscription && (
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#5a647a',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.65rem' }}>
              Meal Status
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {mealOrder.map(slot => {
                const consumed = consumedSlots.has(slot)
                const meta = MEAL_DISPLAY[slot]
                const iconPath = mealIcons[slot]
                return (
                  <div key={slot} style={{
                    background: consumed
                      ? 'rgba(52,211,153,0.08)'
                      : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${consumed ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '12px', padding: '0.85rem',
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '9px',
                      background: consumed ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke={consumed ? '#34d399' : '#5a647a'}
                        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d={iconPath} />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600,
                        color: consumed ? '#34d399' : '#5a647a' }}>
                        {meta.label}
                      </div>
                      <div style={{ fontSize: '0.65rem',
                        color: consumed ? 'rgba(52,211,153,0.6)' : '#2a3248',
                        fontFamily: "'JetBrains Mono', monospace" }}>
                        {consumed ? '✓ done' : '—'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#5a647a',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
            Quick Actions
          </div>
          {[
            {
              href: '/student/history', show: true,
              icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
              label: 'Meal History',
              sub: 'View all past meals',
            },
            {
              href: '/student/change-request',
              show: !!subscription && !pendingRequest,
              icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
              label: 'Request Mess Change',
              sub: 'Switch to another mess',
            },
          ].filter(i => i.show).map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px', padding: '0.9rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.9rem',
                transition: 'border-color 0.2s',
              }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '9px',
                  background: 'rgba(99,102,241,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#818cf8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f0f2f8' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#5a647a', marginTop: '0.1rem' }}>
                    {item.sub}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#2a3248" strokeWidth="2">
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