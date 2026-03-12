// app/(admin)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Card, Badge, StatCard } from '@/components/shared/ui'
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
    db.from('v_today_authorizations').select('*').order('attempted_at', { ascending: false }).limit(12),
  ])

  const adminLinks = [
    { href: '/admin/students',      icon: '◉', label: 'Students',       count: totalStudents,      color: 'var(--accent)' },
    { href: '/admin/subscriptions', icon: '◈', label: 'Subscriptions',  count: activeSubscriptions, color: 'var(--green)' },
    { href: '/admin/requests',      icon: '⇄', label: 'Change Requests',count: pendingRequests,    color: 'var(--yellow)', badge: (pendingRequests ?? 0) > 0 },
    { href: '/admin/meal-timings',  icon: '🕐', label: 'Meal Timings',   count: null,               color: 'var(--text-dim)' },
    { href: '/admin/qr-config',     icon: '⬡', label: 'QR Config',      count: null,               color: 'var(--text-dim)' },
    { href: '/admin/meal-logs',     icon: '◷', label: 'Meal Logs',      count: todayMeals,         color: 'var(--text-dim)' },
    { href: '/admin/reports',       icon: '◧', label: 'Reports',        count: null,               color: 'var(--text-dim)' },
    { href: '/admin/staff',         icon: '🪪', label: 'Staff Mgmt',    count: null,               color: 'var(--text-dim)' },
  ]

  return (
    <>
      <TopBar
        title="Admin Dashboard"
        subtitle="Mess Authorization System"
        userName={profile.full_name}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>

        {/* Key stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <StatCard label="Total Students" value={totalStudents ?? 0} icon="👥" color="var(--accent)" />
          <StatCard label="Active Subs"    value={activeSubscriptions ?? 0} icon="✅" color="var(--green)" />
          <StatCard label="Meals Today"    value={todayMeals ?? 0} icon="🍽" color="var(--text)"
            sublabel={`A: ${messAToday?.length ?? 0}  B: ${messBToday?.length ?? 0}`} />
          <StatCard label="Denied Today"   value={todayDenied ?? 0} icon="🚫" color="var(--red)" />
        </div>

        {/* Pending change requests alert */}
        {(pendingRequests ?? 0) > 0 && (
          <Link href="/admin/requests" style={{ textDecoration: 'none' }}>
            <div style={{
              background:   'var(--yellow-bg)',
              border:       '1px solid var(--yellow-border)',
              borderRadius: 'var(--radius-lg)',
              padding:      '1rem',
              display:      'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.3rem' }}>⏳</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--yellow)', fontSize: '0.9rem' }}>
                  {pendingRequests} Pending Change {pendingRequests === 1 ? 'Request' : 'Requests'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(245,158,11,0.7)' }}>
                  Tap to review and approve or reject
                </div>
              </div>
              <span style={{ color: 'var(--yellow)', opacity: 0.6 }}>→</span>
            </div>
          </Link>
        )}

        {/* Mess today breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          {(['mess_a', 'mess_b'] as MessId[]).map(mId => (
            <Card key={mId} style={{
              borderColor: mId === 'mess_a' ? 'rgba(59,130,246,0.25)' : 'rgba(139,92,246,0.25)',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
                {MESS_DISPLAY[mId].short}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em',
                color: mId === 'mess_a' ? 'var(--accent)' : 'var(--purple)' }}>
                {mId === 'mess_a' ? (messAToday?.length ?? 0) : (messBToday?.length ?? 0)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                meals today
              </div>
            </Card>
          ))}
        </div>

        {/* Admin nav grid */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
            Management
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {adminLinks.map(item => (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <Card hoverable style={{ padding: '0.85rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1rem', color: item.color }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </div>
                    {item.count !== null && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {item.count}
                      </div>
                    )}
                  </div>
                  {item.badge && (
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: 'var(--yellow)', boxShadow: '0 0 6px var(--yellow)',
                    }} />
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity feed */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
            Live Activity
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {(recentAttempts ?? []).slice(0, 8).map(entry => (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.9rem',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <span style={{ color: entry.was_successful ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
                  {entry.was_successful ? '✓' : '✗'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.student_name ?? entry.roll_number ?? 'Unknown'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {entry.mess_id === 'mess_a' ? 'Block A' : 'Block B'}
                    {!entry.was_successful && entry.denial_reason && ` · ${entry.denial_reason.replace(/_/g, ' ')}`}
                  </div>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0 }}>
                  {new Date(entry.attempted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
