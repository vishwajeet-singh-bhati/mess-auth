// app/admin/dashboard/page.tsx — Brutalist Dark

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import type { MessId } from '@/types/database'

export const metadata = { title: 'Admin' }
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

  const stats = [
    { label: 'Students',     value: totalStudents ?? 0 },
    { label: 'Active Subs',  value: activeSubscriptions ?? 0 },
    { label: 'Meals Today',  value: todayMeals ?? 0 },
    { label: 'Denied Today', value: todayDenied ?? 0 },
  ]

  const links = [
    { href: '/admin/students',      label: 'Students',        sub: `${totalStudents ?? 0} registered`, badge: null },
    { href: '/admin/subscriptions', label: 'Subscriptions',   sub: `${activeSubscriptions ?? 0} active`, badge: null },
    { href: '/admin/requests',      label: 'Change Requests', sub: (pendingRequests ?? 0) > 0 ? `${pendingRequests} pending` : 'No pending', badge: pendingRequests },
    { href: '/admin/meal-timings',  label: 'Meal Timings',    sub: 'Configure time slots', badge: null },
    { href: '/admin/meal-logs',     label: 'Meal Logs',       sub: `${todayMeals ?? 0} today`, badge: null },
    { href: '/admin/reports',       label: 'Reports',         sub: 'Export & analytics', badge: null },
    { href: '/admin/staff',         label: 'Staff',           sub: 'Manage assignments', badge: null },
    { href: '/admin/qr-config',     label: 'QR Config',       sub: 'Scanner settings', badge: null },
  ]

  return (
    <>
      <TopBar
        title="Admin"
        subtitle="Mess Authorization System"
        userName={profile.full_name}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>

        {/* Stats — inverted (white bg) */}
        <div style={{ background: '#fff', padding: '1.5rem 1rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace", marginBottom: '1rem' }}>
            Overview · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {stats.map(stat => (
              <div key={stat.label}>
                <div style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: '2rem', fontWeight: 400, color: '#000',
                  lineHeight: 1, letterSpacing: '-0.02em',
                }}>{stat.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.2rem',
                  fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mess split */}
        <div style={{ background: '#0a0a0a', padding: '1rem',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {([['mess_a', messAToday?.length ?? 0],
             ['mess_b', messBToday?.length ?? 0]] as const).map(([id, count]) => (
            <div key={id} style={{ background: '#111', border: '1px solid #1e1e1e',
              borderRadius: '8px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.65rem', color: '#666',
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                {MESS_DISPLAY[id as MessId]?.label}
              </div>
              <div style={{ fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: '1.6rem', color: '#fff', letterSpacing: '-0.02em' }}>
                {count}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#555', marginTop: '0.1rem' }}>
                meals today
              </div>
            </div>
          ))}
        </div>

        {/* Pending alert */}
        {(pendingRequests ?? 0) > 0 && (
          <Link href="/admin/requests" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ background: '#fff', padding: '1rem',
              display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#000', fontSize: '0.88rem' }}>
                  {pendingRequests} Pending Change {pendingRequests === 1 ? 'Request' : 'Requests'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.1rem' }}>
                  Tap to review and action
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#000" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </Link>
        )}

        {/* Management links */}
        <div style={{ background: '#0a0a0a', padding: '1rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.75rem' }}>
            Management
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {links.map(item => (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#111', border: '1px solid #1e1e1e',
                  borderRadius: '8px', padding: '0.85rem 1rem',
                  display: 'flex', alignItems: 'center', gap: '0.85rem',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ccc' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '0.05rem' }}>
                      {item.sub}
                    </div>
                  </div>
                  {item.badge != null && (item.badge as number) > 0 && (
                    <div style={{
                      background: '#fff', color: '#000',
                      borderRadius: '4px', padding: '0.1rem 0.45rem',
                      fontSize: '0.68rem', fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {item.badge}
                    </div>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#333" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        {(recentAttempts?.length ?? 0) > 0 && (
          <div style={{ background: '#0a0a0a', padding: '1rem' }}>
            <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace", marginBottom: '0.75rem' }}>
              Recent Activity
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentAttempts?.slice(0, 6).map((attempt, i) => (
                <div key={attempt.id} style={{
                  padding: '0.65rem 0',
                  borderBottom: i < 5 ? '1px solid #111' : 'none',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                    background: attempt.was_successful ? '#fff' : '#333',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', color: '#ccc',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {attempt.student_name ?? 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#555',
                      fontFamily: "'JetBrains Mono', monospace", marginTop: '0.05rem' }}>
                      {attempt.roll_number ?? '—'} · {attempt.meal_type ?? '—'}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#444', flexShrink: 0,
                    fontFamily: "'JetBrains Mono', monospace" }}>
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