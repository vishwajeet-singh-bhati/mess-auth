// app/(student)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MEAL_DISPLAY, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Card, Badge, StatCard } from '@/components/shared/ui'
import type { MealType, MessId } from '@/types/database'

export const metadata = { title: 'Dashboard' }

// Force dynamic so data is always fresh
export const dynamic = 'force-dynamic'

export default async function StudentDashboardPage() {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()
  const today = dateToDateString(new Date())

  // Fetch student record
  const { data: student } = await db
    .from('students')
    .select('id, roll_number, hostel_block, room_number, is_blocked')
    .eq('user_id', profile.id)
    .single()

  // Fetch active subscription
  const { data: subscription } = await db
    .from('subscriptions')
    .select('id, mess_id, start_date, end_date, plan_name')
    .eq('student_id', student?.id ?? '')
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
    .maybeSingle()

  // Fetch today's meal logs
  const { data: todayMeals } = await db
    .from('meal_logs')
    .select('meal_type, authorized_at, method')
    .eq('student_id', student?.id ?? '')
    .eq('meal_date', today)
    .order('authorized_at', { ascending: true })

  // Fetch mess name if subscribed
  const messDisplay = subscription?.mess_id
    ? MESS_DISPLAY[subscription.mess_id as MessId]
    : null

  // Days until subscription expires
  const daysLeft = subscription
    ? Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / 86400000)
    : 0

  const mealOrder: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner']
  const consumedSlots = new Set((todayMeals ?? []).map(m => m.meal_type))

  const firstName = profile.full_name.split(' ')[0]

  return (
    <>
      <TopBar
        title={`Hey, ${firstName} 👋`}
        subtitle={student?.roll_number}
        userName={profile.full_name}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>

        {/* Blocked warning */}
        {student?.is_blocked && (
          <div style={{
            background: 'var(--red-dim)', border: '1px solid var(--red-border)',
            borderRadius: 'var(--radius-lg)', padding: '1rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1.5rem' }}>🔒</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: '0.9rem' }}>Account Blocked</div>
              <div style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '0.1rem' }}>
                Contact the hostel office to resolve this.
              </div>
            </div>
          </div>
        )}

        {/* Subscription card */}
        <Card style={{ background: subscription
          ? `linear-gradient(135deg, var(--surface) 0%, ${
              subscription.mess_id === 'mess_a'
                ? 'rgba(59,130,246,0.08)' : 'rgba(139,92,246,0.08)'
            } 100%)`
          : 'var(--surface)',
          borderColor: subscription
            ? (subscription.mess_id === 'mess_a' ? 'rgba(59,130,246,0.25)' : 'rgba(139,92,246,0.25)')
            : 'var(--border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
                Active Subscription
              </div>
              {subscription ? (
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  {messDisplay?.label}
                </div>
              ) : (
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  No Subscription
                </div>
              )}
            </div>
            {subscription ? (
              <Badge variant={subscription.mess_id === 'mess_a' ? 'info' : 'purple'}>
                {messDisplay?.short}
              </Badge>
            ) : (
              <Badge variant="danger">Inactive</Badge>
            )}
          </div>

          {subscription ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>VALID UNTIL</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
                  {new Date(subscription.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>DAYS LEFT</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: daysLeft < 7 ? 'var(--yellow)' : 'var(--text)' }}>
                  {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Contact the hostel office to activate a mess subscription.
            </div>
          )}
        </Card>

        {/* Quick scan CTA */}
        {subscription && !student?.is_blocked && (
          <Link href="/student/scan" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
              boxShadow: '0 4px 24px rgba(59,130,246,0.3)',
              cursor: 'pointer',
              border: '1px solid rgba(59,130,246,0.4)',
            }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', flexShrink: 0,
              }}>
                📷
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'white', letterSpacing: '-0.01em' }}>
                  Scan Mess QR
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.1rem' }}>
                  Authorize your meal entry
                </div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem' }}>→</span>
            </div>
          </Link>
        )}

        {/* Today's meals */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
            Today's Meals
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {mealOrder.map(slot => {
              const consumed = consumedSlots.has(slot)
              const meta = MEAL_DISPLAY[slot]
              return (
                <div key={slot} style={{
                  background:   consumed ? 'var(--green-dim)' : 'var(--surface)',
                  border:       `1px solid ${consumed ? 'var(--green-border)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding:      '0.75rem',
                  display:      'flex', alignItems: 'center', gap: '0.6rem',
                  transition:   'all 0.2s',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{meta.emoji}</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700,
                      color: consumed ? 'var(--green)' : 'var(--text-dim)' }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: consumed ? '#86efac' : 'var(--text-muted)' }}>
                      {consumed ? '✓ Done' : '—'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
            Quick Actions
          </div>
          {[
            { href: '/student/history',        icon: '◷', label: 'View Meal History' },
            { href: '/student/change-request', icon: '⇄', label: 'Request Mess Change' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <Card hoverable style={{ padding: '0.9rem 1rem', display: 'flex',
                alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1rem', color: 'var(--accent)' }}>{item.icon}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>→</span>
              </Card>
            </Link>
          ))}
        </div>

      </div>
    </>
  )
}
