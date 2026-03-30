// app/admin/dashboard/page.tsx — Premium Dark Redesign

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import type { MessId } from '@/types/database'

export const metadata = { title: 'Admin Dashboard' }
export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()
  const today = dateToDateString(new Date())

  const [
    { count: totalStudents },
    { count: activeSubscriptions },
    { count: todayMeals },
    { count: todayDenied },
    { count: pendingRequests },
    { data: messAToday },
    { data: messBToday },
    { data: recentAttempts },
  ] = await Promise.all([
    db.from('students').select('*', { count: 'exact', head: true }),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('meal_logs').select('*', { count: 'exact', head: true }).eq('meal_date', today),
    db.from('authorization_attempts').select('*', { count: 'exact', head: true })
      .eq('was_successful', false).gte('attempted_at', today + 'T00:00:00.000Z'),
    db.from('mess_change_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('meal_logs').select('id', { count: 'exact' }).eq('mess_id', 'mess_a').eq('meal_date', today),
    db.from('meal_logs').select('id', { count: 'exact' }).eq('mess_id', 'mess_b').eq('meal_date', today),
    db.from('v_today_authorizations').select('*').order('attempted_at', { ascending: false }).limit(8),
  ])

  const managementLinks = [
    { href: '/admin/students',      label: 'Students',       sub: `${totalStudents ?? 0} registered`,   icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: '#6366f1', badge: null },
    { href: '/admin/subscriptions', label: 'Subscriptions',  sub: `${activeSubscriptions ?? 0} active`,  icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', color: '#34d399', badge: null },
    { href: '/admin/requests',      label: 'Change Requests',sub: (pendingRequests ?? 0) > 0 ? `${pendingRequests} pending` : 'No pending', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', color: '#fbbf24', badge: pendingRequests },
    { href: '/admin/meal-timings',  label: 'Meal Timings',   sub: 'Configure slots',    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: '#818cf8', badge: null },
    { href: '/admin/meal-logs',     label: 'Meal Logs',      sub: `${todayMeals ?? 0} today`,            icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: '#60a5fa', badge: null },
    { href: '/admin/reports',       label: 'Reports',        sub: 'Export & analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: '#f472b6', badge: null },
    { href: '/admin/staff',         label: 'Staff',          sub: 'Manage assignments', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0', color: '#a78bfa', badge: null },
    { href: '/admin/qr-config',     label: 'QR Config',      sub: 'Scanner settings',   icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z', color: '#fb923c', badge: null },
  ]

  return (
    <>
      <TopBar
        title="Admin"
        subtitle="Mess Authorization System"
        userName={profile.full_name}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          {[
            { label: 'Students',     value: totalStudents ?? 0,       color: '#6366f1', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            { label: 'Active Subs',  value: activeSubscriptions ?? 0, color: '#34d399', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Meals Today',  value: todayMeals ?? 0,          color: '#818cf8', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
            { label: 'Denied Today', value: todayDenied ?? 0,         color: '#f87171', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px', padding: '1rem',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-15px', right: '-15px',
                width: '70px', height: '70px', borderRadius: '50%',
                background: stat.color, opacity: 0.06, filter: 'blur(20px)',
                pointerEvents: 'none',
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '9px',
                  background: `${stat.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={stat.color} strokeWidth="1.75"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d={stat.icon} />
                  </svg>
                </div>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%',
                  background: stat.color, boxShadow: `0 0 6px ${stat.color}` }} />
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.7rem',
                fontWeight: 800, color: stat.color, lineHeight: 1,
                letterSpacing: '-0.03em' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#5a647a',
                marginTop: '0.3rem', fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Mess today split */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '14px', padding: '1rem',
        }}>
          <div style={{ fontSize: '0.65rem', color: '#5a647a', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
            Mess Distribution Today
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {([['mess_a', messAToday?.length ?? 0, '#6366f1'],
               ['mess_b', messBToday?.length ?? 0, '#a78bfa']] as const).map(([id, count, color]) => (
              <div key={id} style={{
                background: `${color}08`,
                border: `1px solid ${color}20`,
                borderRadius: '10px', padding: '0.85rem',
              }}>
                <div style={{ fontSize: '0.7rem', color: '#5a647a', marginBottom: '0.3rem' }}>
                  {MESS_DISPLAY[id as MessId]?.label}
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.5rem',
                  fontWeight: 800, color, letterSpacing: '-0.02em' }}>
                  {count}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#5a647a', marginTop: '0.15rem' }}>
                  meals served
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending requests alert */}
        {(pendingRequests ?? 0) > 0 && (
          <Link href="/admin/requests" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(251,191,36,0.06)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: '12px', padding: '1rem',
              display: 'flex', alignItems: 'center', gap: '0.85rem',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(251,191,36,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#fbbf24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: '0.88rem' }}>
                  {pendingRequests} Pending Change {pendingRequests === 1 ? 'Request' : 'Requests'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(251,191,36,0.5)', marginTop: '0.1rem' }}>
                  Tap to review
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="rgba(251,191,36,0.4)" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </Link>
        )}

        {/* Management grid */}
        <div>
          <div style={{ fontSize: '0.65rem', color: '#5a647a', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
            Management
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {managementLinks.map(item => (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px', padding: '0.85rem 1rem',
                  display: 'flex', alignItems: 'center', gap: '0.85rem',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '9px',
                    background: `${item.color}12`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke={item.color} strokeWidth="1.75"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon} />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f0f2f8' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#5a647a', marginTop: '0.05rem' }}>
                      {item.sub}
                    </div>
                  </div>
                  {item.badge != null && (item.badge as number) > 0 && (
                    <div style={{
                      background: '#fbbf24', color: '#000',
                      borderRadius: '99px', padding: '0.15rem 0.5rem',
                      fontSize: '0.65rem', fontWeight: 700,
                    }}>
                      {item.badge}
                    </div>
                  )}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="#2a3248" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        {(recentAttempts?.length ?? 0) > 0 && (
          <div>
            <div style={{ fontSize: '0.65rem', color: '#5a647a', fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
              Recent Activity
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {recentAttempts?.slice(0, 5).map(attempt => (
                <div key={attempt.id} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '10px', padding: '0.7rem 0.9rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                    background: attempt.was_successful ? '#34d399' : '#f87171',
                    boxShadow: `0 0 6px ${attempt.was_successful ? '#34d399' : '#f87171'}`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#a8b0c8',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {attempt.student_name ?? 'Unknown'} · {attempt.roll_number ?? '—'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#5a647a', marginTop: '0.05rem',
                      fontFamily: "'JetBrains Mono', monospace" }}>
                      {attempt.mess_id?.replace('_', ' ')} · {attempt.meal_type ?? '—'}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#2a3248', flexShrink: 0 }}>
                    {new Date(attempt.attempted_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}