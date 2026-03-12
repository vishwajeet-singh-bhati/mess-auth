// app/(admin)/meal-logs/page.tsx
import { redirect } from 'next/navigation'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MEAL_DISPLAY, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Badge, EmptyState, Card } from '@/components/shared/ui'
import type { MealType, MessId, AuthorizationMethod } from '@/types/database'

export const metadata = { title: 'Meal Logs' }
export const dynamic = 'force-dynamic'

const METHOD_BADGE: Record<AuthorizationMethod, { label: string; color: string }> = {
  qr_scan:      { label: '📷 QR',     color: 'var(--green)'  },
  manual_staff: { label: '✋ Manual', color: 'var(--yellow)' },
  admin_override: { label: '🔑 Admin', color: 'var(--accent)' },
}

export default async function AdminMealLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; mess?: string; meal?: string }>
}) {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()
  const today = dateToDateString(new Date())

  const sp = await searchParams
  const filterDate = sp.date ?? today
  const filterMess = sp.mess as MessId | undefined
  const filterMeal = sp.meal as MealType | undefined

  // Build query
  let query = db
    .from('meal_logs')
    .select(`
      id, meal_type, mess_id, authorized_at, method, meal_date,
      students (
        roll_number,
        users ( full_name )
      )
    `)
    .eq('meal_date', filterDate)
    .order('authorized_at', { ascending: false })
    .limit(200)

  if (filterMess) query = query.eq('mess_id', filterMess)
  if (filterMeal) query = query.eq('meal_type', filterMeal)

  const { data: logs } = await query

  // Also fetch denied attempts for this date
  let deniedQuery = db
    .from('authorization_attempts')
    .select('id, roll_number, mess_id, meal_type, denial_reason, method, attempted_at, students(users(full_name))')
    .eq('was_successful', false)
    .gte('attempted_at', filterDate + 'T00:00:00.000Z')
    .lte('attempted_at', filterDate + 'T23:59:59.999Z')
    .order('attempted_at', { ascending: false })
    .limit(100)

  if (filterMess) deniedQuery = deniedQuery.eq('mess_id', filterMess)

  const { data: denied } = await deniedQuery

  // Per-mess, per-slot counts
  const counts = {
    mess_a: { breakfast: 0, lunch: 0, snacks: 0, dinner: 0, total: 0 },
    mess_b: { breakfast: 0, lunch: 0, snacks: 0, dinner: 0, total: 0 },
  }
  for (const log of logs ?? []) {
    const m = log.mess_id as MessId
    const s = log.meal_type as MealType
    if (counts[m] && counts[m][s] !== undefined) {
      counts[m][s]++
      counts[m].total++
    }
  }

  const inputStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem',
    color: 'var(--text)', fontSize: '0.82rem', outline: 'none',
  }

  return (
    <>
      <TopBar
        title="Meal Logs"
        subtitle={`${logs?.length ?? 0} meals · ${filterDate}`}
        back
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        {/* Filters — using native form for server-side filtering */}
        <form method="GET" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            name="date"
            type="date"
            defaultValue={filterDate}
            style={{ ...inputStyle, flex: '1', minWidth: '120px' }}
          />
          <select name="mess" defaultValue={filterMess ?? ''} style={{ ...inputStyle, flex: '1' }}>
            <option value="">All Messes</option>
            <option value="mess_a">Block A</option>
            <option value="mess_b">Block B</option>
          </select>
          <select name="meal" defaultValue={filterMeal ?? ''} style={{ ...inputStyle, flex: '1' }}>
            <option value="">All Meals</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="snacks">Snacks</option>
            <option value="dinner">Dinner</option>
          </select>
          <button type="submit" style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem',
            cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
          }}>
            Filter
          </button>
        </form>

        {/* Mess breakdown summary */}
        {!filterMess && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {(['mess_a', 'mess_b'] as MessId[]).map(mId => {
              const c = counts[mId]
              const color = mId === 'mess_a' ? 'var(--accent)' : 'var(--purple)'
              return (
                <Card key={mId} style={{
                  borderColor: mId === 'mess_a' ? 'rgba(59,130,246,0.2)' : 'rgba(139,92,246,0.2)',
                }}>
                  <div style={{ fontWeight: 800, fontSize: '0.7rem', color,
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
                    {MESS_DISPLAY[mId].short}
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color, marginBottom: '0.5rem' }}>
                    {c.total}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    {(['breakfast','lunch','snacks','dinner'] as MealType[]).map(slot => (
                      <div key={slot} style={{ display: 'flex', justifyContent: 'space-between',
                        fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        <span>{MEAL_DISPLAY[slot].emoji} {MEAL_DISPLAY[slot].label}</span>
                        <span style={{ fontWeight: 700 }}>{c[slot]}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Authorized meals log */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '0.6rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Authorized Meals ({logs?.length ?? 0})
            </div>
          </div>

          {(logs?.length ?? 0) === 0 ? (
            <EmptyState icon="🍽" title="No meals for this date"
              subtitle="Try changing the date or filter." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {logs?.map(log => {
                const stu  = (log.students as any)
                const user = stu?.users
                const meal = MEAL_DISPLAY[log.meal_type as MealType]
                const mess = MESS_DISPLAY[log.mess_id as MessId]
                const method = METHOD_BADGE[log.method as AuthorizationMethod]

                return (
                  <div key={log.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.65rem 0.9rem',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{meal.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.full_name ?? '—'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)',
                        fontFamily: 'monospace', marginTop: '0.05rem' }}>
                        {stu?.roll_number} · {mess.short}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)' }}>
                        {new Date(log.authorized_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: method.color, marginTop: '0.05rem' }}>
                        {method.label}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Denied attempts */}
        {(denied?.length ?? 0) > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
              Denied Attempts ({denied?.length ?? 0})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {denied?.map(attempt => {
                const stu = (attempt.students as any)
                const name = stu?.users?.full_name
                return (
                  <div key={attempt.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.65rem 0.9rem',
                    background: 'var(--surface)', border: '1px solid var(--red-border)',
                    borderRadius: 'var(--radius-md)', opacity: 0.85,
                  }}>
                    <span style={{ color: 'var(--red)', flexShrink: 0, fontWeight: 800 }}>✗</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-dim)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name ?? attempt.roll_number ?? 'Unknown'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#fca5a580',
                        textTransform: 'capitalize', marginTop: '0.05rem' }}>
                        {attempt.denial_reason?.replace(/_/g, ' ')}
                        {attempt.mess_id && ` · ${MESS_DISPLAY[attempt.mess_id as MessId]?.short}`}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {new Date(attempt.attempted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
