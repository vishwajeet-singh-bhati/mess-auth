// app/(admin)/staff/page.tsx
import { redirect } from 'next/navigation'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Badge, EmptyState } from '@/components/shared/ui'
import { StaffActions } from './StaffActions'
import type { MessId } from '@/types/database'

export const metadata = { title: 'Staff Management' }
export const dynamic = 'force-dynamic'

export default async function AdminStaffPage() {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()

  // All staff users with their mess assignments
  const { data: staffUsers } = await db
    .from('users')
    .select(`
      id, full_name, email, is_active, created_at,
      staff_mess_mapping ( mess_id, is_primary, assigned_at )
    `)
    .eq('role', 'staff')
    .order('full_name', { ascending: true })

  // Today's activity per staff (manual verifications)
  const today = new Date().toISOString().split('T')[0]
  const { data: manualCounts } = await db
    .from('authorization_attempts')
    .select('mess_id')
    .eq('method', 'manual_staff')
    .gte('attempted_at', today + 'T00:00:00.000Z')

  return (
    <>
      <TopBar
        title="Staff Management"
        subtitle={`${staffUsers?.length ?? 0} staff accounts`}
        back
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          {[
            { label: 'Total Staff', value: staffUsers?.length ?? 0, color: 'var(--text)' },
            { label: 'Block A',     value: staffUsers?.filter(s => (s.staff_mess_mapping as any)?.[0]?.mess_id === 'mess_a').length ?? 0, color: 'var(--accent)' },
            { label: 'Block B',     value: staffUsers?.filter(s => (s.staff_mess_mapping as any)?.[0]?.mess_id === 'mess_b').length ?? 0, color: 'var(--purple)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '0.7rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.1rem' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Create staff CTA */}
        <StaffActions adminId={profile.id} mode="create" />

        {/* Staff list */}
        {(staffUsers?.length ?? 0) === 0 ? (
          <EmptyState icon="🪪" title="No staff accounts"
            subtitle="Create staff accounts to enable manual verification and dashboards." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {staffUsers?.map(staff => {
              const mapping = (staff.staff_mess_mapping as any)?.[0]
              const messId  = mapping?.mess_id as MessId | undefined
              const manualToday = manualCounts?.filter(m => m.mess_id === messId).length ?? 0

              return (
                <div key={staff.id} style={{
                  background:   'var(--surface)',
                  border:       `1px solid ${staff.is_active ? 'var(--border)' : 'var(--red-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding:      '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>
                        {staff.full_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {staff.email}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap',
                      justifyContent: 'flex-end', marginLeft: '0.5rem' }}>
                      {!staff.is_active && <Badge variant="danger" size="sm">Inactive</Badge>}
                      {messId ? (
                        <Badge variant={messId === 'mess_a' ? 'info' : 'purple'} size="sm">
                          {MESS_DISPLAY[messId]?.short}
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">Unassigned</Badge>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem',
                    color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    {messId && (
                      <span>{MESS_DISPLAY[messId]?.label}</span>
                    )}
                    <span>Today: {manualToday} manual verif.</span>
                    <span>Since {new Date(staff.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                  </div>

                  <StaffActions
                    adminId={profile.id}
                    mode="manage"
                    staffUser={{ id: staff.id, isActive: staff.is_active, assignedMessId: messId }}
                  />
                </div>
              )
            })}
          </div>
        )}

      </div>
    </>
  )
}
