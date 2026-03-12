'use client'
// app/(admin)/staff/StaffActions.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Alert } from '@/components/shared/ui'
import type { MessId } from '@/types/database'

interface ManageProps {
  adminId: string
  mode: 'manage'
  staffUser: {
    id: string
    isActive: boolean
    assignedMessId?: MessId
  }
}
interface CreateProps {
  adminId: string
  mode: 'create'
}
type Props = ManageProps | CreateProps

export function StaffActions(props: Props) {
  const router = useRouter()
  const supabase = createClient()
  
  // ── HOOKS MUST BE AT THE VERY TOP ─────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ 
    email: '', 
    full_name: '', 
    mess_id: 'mess_a' as MessId, 
    password: '' 
  })

  // ── Manage existing staff ─────────────────────────────────────────────────
  if (props.mode === 'manage') {
    const { staffUser } = props

    const toggleActive = async () => {
      setLoading(true)
      await supabase.from('users')
        .update({ is_active: !staffUser.isActive })
        .eq('id', staffUser.id)
      setLoading(false)
      router.refresh()
    }

    const reassignMess = async (messId: MessId) => {
      setLoading(true)
      await supabase.from('staff_mess_mapping')
        .upsert({ user_id: staffUser.id, mess_id: messId, is_primary: true },
          { onConflict: 'user_id,mess_id' })
      
      if (staffUser.assignedMessId && staffUser.assignedMessId !== messId) {
        await supabase.from('staff_mess_mapping')
          .delete()
          .eq('user_id', staffUser.id)
          .eq('mess_id', staffUser.assignedMessId)
      }
      setLoading(false)
      router.refresh()
    }

    return (
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          onChange={e => reassignMess(e.target.value as MessId)}
          defaultValue={staffUser.assignedMessId ?? ''}
          disabled={loading}
          style={{
            background: 'var(--surface-high)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.6rem',
            color: 'var(--text)', fontSize: '0.78rem', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="" disabled>Assign mess…</option>
          <option value="mess_a">Block A Mess</option>
          <option value="mess_b">Block B Mess</option>
        </select>

        <Button variant={staffUser.isActive ? 'ghost' : 'success'} size="sm"
          loading={loading} onClick={toggleActive}
          style={{ color: staffUser.isActive ? 'var(--red)' : undefined }}>
          {staffUser.isActive ? 'Deactivate' : '✓ Reactivate'}
        </Button>
      </div>
    )
  }

  // ── Create new staff account Logic ─────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.email || !form.full_name || !form.password) {
      setError('All fields are required.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create staff account.')
        setLoading(false)
        return
      }
      setShowForm(false)
      setForm({ email: '', full_name: '', mess_id: 'mess_a', password: '' })
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  if (!showForm) {
    return (
      <button onClick={() => setShowForm(true)} style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.9rem 1rem', width: '100%',
        background: 'var(--accent-dim)', border: '1px dashed rgba(59,130,246,0.4)',
        borderRadius: 'var(--radius-lg)', cursor: 'pointer', color: 'var(--accent)',
        fontSize: '0.88rem', fontWeight: 700,
      }}>
        <span style={{ fontSize: '1.1rem' }}>+</span>
        Add Staff Account
      </button>
    )
  }

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.8rem',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.85rem',
    outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    display: 'block', fontSize: '0.68rem', fontWeight: 800,
    color: 'var(--text-muted)', textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', marginBottom: '0.3rem',
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--accent)',
      borderRadius: 'var(--radius-lg)', padding: '1.25rem',
      display: 'flex', flexDirection: 'column', gap: '0.9rem',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>
        New Staff Account
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div><label style={labelStyle}>Full Name</label>
          <input style={inputStyle} placeholder="Suresh Naidu"
            value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div><label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" placeholder="staff@mess.in"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div><label style={labelStyle}>Temporary Password</label>
          <input style={inputStyle} type="password" placeholder="Min 8 characters"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </div>
        <div><label style={labelStyle}>Assigned Mess</label>
          <select style={inputStyle} value={form.mess_id}
            onChange={e => setForm(f => ({ ...f, mess_id: e.target.value as MessId }))}>
            <option value="mess_a">Block A Mess</option>
            <option value="mess_b">Block B Mess</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button fullWidth loading={loading} onClick={handleCreate}>
          Create Staff Account
        </Button>
        <Button variant="secondary" onClick={() => { setShowForm(false); setError(null) }}>
          Cancel
        </Button>
      </div>
    </div>
  )
}