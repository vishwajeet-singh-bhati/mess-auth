'use client'
// app/(admin)/meal-timings/page.tsx

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/shared/TopBar'
import { Button, Alert, Card, Badge } from '@/components/shared/ui'
import { MEAL_DISPLAY, MESS_DISPLAY } from '@/lib/meal/slots'
import type { MealType, MessId } from '@/types/database'

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner']

interface SlotData {
  id:         string
  mess_id:    MessId
  meal_type:  MealType
  start_time: string
  end_time:   string
  is_active:  boolean
}

export default function MealTimingsPage() {
  const supabase = createClient()
  const [slots, setSlots]     = useState<SlotData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    supabase.from('meal_slots')
      .select('*')
      .order('mess_id')
      .order('meal_type')
      .then(({ data }) => {
        setSlots((data ?? []) as SlotData[])
        setLoading(false)
      })
  }, [])

  const updateSlot = async (slotId: string, field: string, value: string | boolean) => {
    setSaving(slotId)
    setError(null)

    const { error: err } = await supabase
      .from('meal_slots')
      .update({ [field]: value })
      .eq('id', slotId)

    if (err) {
      setError(err.message)
    } else {
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, [field]: value } : s))
      setSuccess(`Saved!`)
      setTimeout(() => setSuccess(null), 2000)
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <>
        <TopBar title="Meal Timings" back />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid transparent',
            borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Meal Timings" back subtitle="Configure meal windows per mess" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '0.75rem' }}>

        {success && <Alert variant="success">✓ {success}</Alert>}
        {error   && <Alert variant="error">{error}</Alert>}

        {(['mess_a', 'mess_b'] as MessId[]).map(messId => {
          const messSlots = slots.filter(s => s.mess_id === messId)
          const mess = MESS_DISPLAY[messId]

          return (
            <div key={messId}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800,
                color: messId === 'mess_a' ? 'var(--accent)' : 'var(--purple)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
                {mess.label}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {MEAL_ORDER.map(mealType => {
                  const slot = messSlots.find(s => s.meal_type === mealType)
                  if (!slot) return null
                  const meta = MEAL_DISPLAY[mealType]
                  const isSaving = saving === slot.id

                  return (
                    <Card key={slot.id} style={{
                      opacity: slot.is_active ? 1 : 0.6,
                      borderColor: slot.is_active ? 'var(--border)' : 'var(--border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>{meta.emoji}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>
                          {meta.label}
                        </span>
                        <button
                          onClick={() => updateSlot(slot.id, 'is_active', !slot.is_active)}
                          style={{
                            marginLeft: 'auto',
                            background:   slot.is_active ? 'var(--green-dim)' : 'var(--surface-high)',
                            border:       `1px solid ${slot.is_active ? 'var(--green-border)' : 'var(--border)'}`,
                            borderRadius: '0.4rem',
                            padding:      '0.2rem 0.6rem',
                            fontSize:     '0.7rem',
                            fontWeight:   700,
                            color:        slot.is_active ? 'var(--green)' : 'var(--text-muted)',
                            cursor:       'pointer',
                          }}
                        >
                          {slot.is_active ? '● Active' : '○ Off'}
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                        {[
                          { label: 'Start Time', field: 'start_time', value: slot.start_time.slice(0, 5) },
                          { label: 'End Time',   field: 'end_time',   value: slot.end_time.slice(0, 5) },
                        ].map(({ label, field, value }) => (
                          <div key={field}>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700,
                              color: 'var(--text-muted)', textTransform: 'uppercase',
                              letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
                              {label}
                            </label>
                            <input
                              type="time"
                              defaultValue={value}
                              onBlur={e => {
                                if (e.target.value !== value) {
                                  updateSlot(slot.id, field, e.target.value + ':00')
                                }
                              }}
                              style={{
                                width: '100%', padding: '0.5rem 0.6rem',
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                                fontSize: '0.9rem', fontFamily: 'monospace', outline: 'none',
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      {isSaving && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.4rem' }}>
                          Saving…
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}

      </div>
    </>
  )
}
