'use client'
// app/(admin)/requests/RequestActions.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/shared/ui'
import type { MessId } from '@/types/database'

interface RequestActionsProps {
  requestId:  string
  adminId:    string
  studentId?: string
  toMessId:   MessId
  fromMessId: MessId
}

export function RequestActions({ requestId, adminId, studentId, toMessId, fromMessId }: RequestActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading]   = useState<'approve' | 'reject' | null>(null)
  const [note, setNote]         = useState('')
  const [showNote, setShowNote] = useState(false)

  const approve = async () => {
    setLoading('approve')

    // Update request status
    await supabase.from('mess_change_requests').update({
      status:       'approved',
      reviewed_by:  adminId,
      reviewed_at:  new Date().toISOString(),
      review_note:  note.trim() || null,
      effective_date: new Date().toISOString().split('T')[0],
    }).eq('id', requestId)

    // Deactivate current subscription and create new one
    if (studentId) {
      const today = new Date().toISOString().split('T')[0]
      const endOfYear = new Date().getFullYear() + '-12-31'

      await supabase.from('subscriptions')
        .update({ status: 'inactive' })
        .eq('student_id', studentId)
        .eq('status', 'active')

      await supabase.from('subscriptions').insert({
        student_id:  studentId,
        mess_id:     toMessId,
        status:      'active',
        start_date:  today,
        end_date:    endOfYear,
        plan_name:   'Annual Plan',
        created_by:  adminId,
      })
    }

    setLoading(null)
    router.refresh()
  }

  const reject = async () => {
    if (!note.trim()) { setShowNote(true); return }
    setLoading('reject')

    await supabase.from('mess_change_requests').update({
      status:      'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      review_note: note.trim(),
    }).eq('id', requestId)

    setLoading(null)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {showNote && (
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={loading === 'reject' ? 'Reason for rejection (required)...' : 'Optional note...'}
          style={{
            padding: '0.5rem 0.75rem', background: 'var(--surface-high)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text)', fontSize: '0.82rem', outline: 'none', width: '100%',
          }}
        />
      )}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          variant="success" size="sm"
          loading={loading === 'approve'}
          disabled={loading !== null}
          onClick={approve}
          style={{ flex: 1 }}
        >
          ✓ Approve
        </Button>
        <Button
          variant="danger" size="sm"
          loading={loading === 'reject'}
          disabled={loading !== null}
          onClick={reject}
          style={{ flex: 1 }}
        >
          ✗ Reject
        </Button>
        {!showNote && (
          <Button variant="ghost" size="sm" onClick={() => setShowNote(true)}>
            + Note
          </Button>
        )}
      </div>
    </div>
  )
}
