'use client'
// app/(admin)/subscriptions/SubscriptionActions.tsx
// Handles both creating new subscriptions and managing existing ones.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Alert } from '@/components/shared/ui'
import { MESS_DISPLAY } from '@/lib/meal/slots'
import type { MessId, SubscriptionStatus } from '@/types/database'

interface ManageProps {
  adminId: string
  mode: 'manage'
  subscription: {
    id:        string
    studentId: string
    status:    SubscriptionStatus
    messId:    MessId
    endDate:   string
  }
}

interface CreateProps {
  adminId: string
  mode: 'create'
}

type Props = ManageProps | CreateProps

export function SubscriptionActions(props: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // ── Manage existing subscription ──────────────────────────────────────────
  if (props.mode === 'manage') {
    const { subscription } = props

    const deactivate = async () => {
      if (!confirm('Deactivate this subscription?')) return
      setLoading(true)
      await supabase.from('subscriptions')
        .update({ status: 'inactive' })
        .eq('id', subscription.id)
      setLoading(false)
      router.refresh()
    }

    const extend = async () => {
      setLoading(true)
      const currentEnd = new Date(subscription.endDate + 'T00:00:00')
      const newEnd = new Date(currentEnd)
      newEnd.setMonth(newEnd.getMonth() + 6)
      await supabase.from('subscriptions')
        .update({ end_date: newEnd.toISOString().split('T')[0] })
        .eq('id', subscription.id)
      setLoading(false)
      router.refresh()
    }

    return (
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {subscription.status === 'active' ? (
          <>
            <Button variant="secondary" size="sm" loading={loading} onClick={extend}>
              +6 Months
            </Button>
            <Button variant="ghost" size="sm" loading={loading} onClick={deactivate}
              style={{ color: 'var(--red)' }}>
              Deactivate
            </Button>
          </>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.3rem 0' }}>
            Subscription {subscription.status}
          </span>
        )}
      </div>
    )
  }

  // ── Create new subscription ────────────────────────────────────────────────
  const [form, setForm] = useState({
    roll_number: '',
    mess_id: 'mess_a' as MessId,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().getFullYear() + '-12-31',
    plan_name: 'Annual Plan',
    monthly_fee: '3500',
  })

  const handleCreate = async () => {
    setError(null)
    setLoading(true)

    // Find student by roll number
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('id')
      .eq('roll_number', form.roll_number.toUpperCase())
      .single()

    if (sErr || !student) {
      setError(`Student not found: ${form.roll_number.toUpperCase()}`)
      setLoading(false)
      return
    }

    // Check for existing active subscription
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('student_id', student.id)
      .eq('status', 'active')
      .lte('start_date', form.end_date)
      .gte('end_date', form.start_date)
      .maybeSingle()

    if (existing) {
      setError('Student already has an active subscription overlapping this period.')
      setLoading(false)
      return
    }

    const { error: insErr } = await supabase.from('subscriptions').insert({
      student_id:  student.id,
      mess_id:     form.mess_id,
      status:      'active',
      start_date:  form.start_date,
      end_date:    form.end_date,
      plan_name:   form.plan_name,
      monthly_fee: parseFloat(form.monthly_fee) || null,
      created_by:  props.adminId,
    })

    if (insErr) {
      setError(insErr.message)
      setLoading(false)
      return
    }

    setShowForm(false)
    setForm({ roll_number: '', mess_id: 'mess_a', start_date: today,
      end_date: new Date().getFullYear() + '-12-31', plan_name: 'Annual Plan', monthly_fee: '3500' })
    setLoading(false)
    router.refresh()
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.9rem 1rem', width: '100%',
          background: 'var(--accent-dim)', border: '1px dashed rgba(59,130,246,0.4)',
          borderRadius: 'var(--radius-lg)', cursor: 'pointer', color: 'var(--accent)',
          fontSize: '0.88rem', fontWeight: 700,
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>+</span>
        Create New Subscription
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
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
        New Subscription
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Roll Number</label>
          <input style={inputStyle} placeholder="CS21B001"
            value={form.roll_number}
            onChange={e => setForm(f => ({ ...f, roll_number: e.target.value }))} />
        </div>

        <div>
          <label style={labelStyle}>Mess</label>
          <select style={inputStyle} value={form.mess_id}
            onChange={e => setForm(f => ({ ...f, mess_id: e.target.value as MessId }))}>
            <option value="mess_a">Block A Mess</option>
            <option value="mess_b">Block B Mess</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Monthly Fee (₹)</label>
          <input style={inputStyle} type="number" placeholder="3500"
            value={form.monthly_fee}
            onChange={e => setForm(f => ({ ...f, monthly_fee: e.target.value }))} />
        </div>

        <div>
          <label style={labelStyle}>Start Date</label>
          <input style={inputStyle} type="date" value={form.start_date}
            onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
        </div>

        <div>
          <label style={labelStyle}>End Date</label>
          <input style={inputStyle} type="date" value={form.end_date}
            onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button fullWidth loading={loading} onClick={handleCreate}
          disabled={!form.roll_number.trim()}>
          Create Subscription
        </Button>
        <Button variant="secondary" onClick={() => { setShowForm(false); setError(null) }}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
