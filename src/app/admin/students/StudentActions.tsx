'use client'
// app/(admin)/students/StudentActions.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/shared/ui'

interface StudentActionsProps {
  studentId: string
  isBlocked: boolean
  adminId:   string
}

export function StudentActions({ studentId, isBlocked, adminId }: StudentActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  const handleUnblock = async () => {
    setLoading(true)
    await supabase.from('students').update({
      is_blocked:   false,
      block_reason: null,
      blocked_at:   null,
      blocked_by:   null,
    }).eq('id', studentId)
    setLoading(false)
    router.refresh()
  }

  const handleBlock = async () => {
    if (!blockReason.trim()) return
    setLoading(true)
    await supabase.rpc('fn_block_student', {
      p_student_id: studentId,
      p_reason:     blockReason.trim(),
      p_blocked_by: adminId,
    })
    setShowBlockForm(false)
    setBlockReason('')
    setLoading(false)
    router.refresh()
  }

  if (isBlocked) {
    return (
      <Button variant="success" size="sm" loading={loading} onClick={handleUnblock}>
        ✓ Unblock Student
      </Button>
    )
  }

  if (showBlockForm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input
          value={blockReason}
          onChange={e => setBlockReason(e.target.value)}
          placeholder="Reason for blocking..."
          style={{
            padding: '0.5rem 0.75rem', background: 'var(--surface-high)',
            border: '1px solid var(--red-border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text)', fontSize: '0.82rem', outline: 'none', width: '100%',
          }}
        />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <Button variant="danger" size="sm" loading={loading}
            disabled={!blockReason.trim()} onClick={handleBlock}>
            Confirm Block
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowBlockForm(false)}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => setShowBlockForm(true)}
      style={{ color: 'var(--red)', borderColor: 'transparent' }}>
      🔒 Block Student
    </Button>
  )
}
