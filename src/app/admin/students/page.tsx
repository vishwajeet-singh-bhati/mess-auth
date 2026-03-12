// app/(admin)/students/page.tsx
import { redirect } from 'next/navigation'
import { getServerUserProfile } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dateToDateString, MESS_DISPLAY } from '@/lib/meal/slots'
import { TopBar } from '@/components/shared/TopBar'
import { Badge, EmptyState } from '@/components/shared/ui'
import { StudentActions } from './StudentActions'
import type { MessId } from '@/types/database'

export const metadata = { title: 'Students' }
export const dynamic = 'force-dynamic'

export default async function AdminStudentsPage() {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')

  const db = createAdminClient()
  const today = dateToDateString(new Date())

  const { data: students } = await db
    .from('v_student_subscription_status')
    .select('*')
    .order('roll_number', { ascending: true })

  return (
    <>
      <TopBar
        title="Students"
        subtitle={`${students?.length ?? 0} total`}
        back
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.75rem' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.25rem' }}>
          {[
            { label: 'Total',      value: students?.length ?? 0, color: 'var(--text)' },
            { label: 'Active Sub', value: students?.filter(s => s.subscription_status === 'active').length ?? 0, color: 'var(--green)' },
            { label: 'Blocked',    value: students?.filter(s => s.is_blocked).length ?? 0, color: 'var(--red)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '0.65rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {(students?.length ?? 0) === 0 ? (
          <EmptyState icon="👥" title="No students found" />
        ) : (
          students?.map(student => (
            <div key={student.student_id} style={{
              background:   'var(--surface)',
              border:       `1px solid ${student.is_blocked ? 'var(--red-border)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding:      '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {student.full_name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.1rem' }}>
                    {student.roll_number}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0, marginLeft: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {student.is_blocked && <Badge variant="danger" size="sm">Blocked</Badge>}
                  {student.subscription_status === 'active' ? (
                    <Badge variant={student.subscribed_mess === 'mess_a' ? 'info' : 'purple'} size="sm">
                      {MESS_DISPLAY[student.subscribed_mess as MessId]?.short ?? '—'}
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">No Sub</Badge>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)',
                marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                <span>{student.email}</span>
                {student.subscription_status === 'active' && student.end_date && (
                  <>
                    <span>·</span>
                    <span>
                      Sub until {new Date(student.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </>
                )}
                {student.is_blocked && student.block_reason && (
                  <>
                    <span>·</span>
                    <span style={{ color: '#fca5a580' }}>
                      Blocked: {student.block_reason}
                    </span>
                  </>
                )}
              </div>

              {/* Client component for block/unblock actions */}
              <StudentActions
                studentId={student.student_id}
                isBlocked={student.is_blocked}
                adminId={profile.id}
              />
            </div>
          ))
        )}
      </div>
    </>
  )
}
