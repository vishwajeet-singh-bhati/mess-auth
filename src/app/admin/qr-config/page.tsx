'use client'
// app/(admin)/qr-config/page.tsx

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/shared/TopBar'
import { Button, Alert, Card } from '@/components/shared/ui'
import { MESS_DISPLAY } from '@/lib/meal/slots'
import type { MessId } from '@/types/database'

interface QRConfig {
  id: string
  mess_id: MessId
  token_ttl_secs: number
  refresh_interval_secs: number
  is_enabled: boolean
}

export default function QRConfigPage() {
  const supabase = createClient()
  const [configs, setConfigs] = useState<QRConfig[]>([])
  const [saving, setSaving]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('qr_config').select('*').then(({ data }) => {
      setConfigs((data ?? []) as QRConfig[])
      setLoading(false)
    })
  }, [])

  const updateConfig = async (id: string, field: string, value: any) => {
    setSaving(id)
    setError(null)

    // Validate: refresh must be < ttl
    const cfg = configs.find(c => c.id === id)!
    const updated = { ...cfg, [field]: value }
    if (updated.refresh_interval_secs >= updated.token_ttl_secs) {
      setError('Refresh interval must be less than token TTL.')
      setSaving(null)
      return
    }

    const { error: err } = await supabase.from('qr_config').update({ [field]: value }).eq('id', id)
    if (err) {
      setError(err.message)
    } else {
      setConfigs(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    }
    setSaving(null)
  }

  if (loading) return (
    <>
      <TopBar title="QR Configuration" back />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid transparent',
          borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
      </div>
    </>
  )

  return (
    <>
      <TopBar title="QR Configuration" back subtitle="Token TTL and kiosk refresh settings" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.75rem' }}>

        <Alert variant="info">
          Token TTL controls how long each QR is valid. Refresh interval is how often the kiosk fetches a new code.
          Recommended: TTL = 30s, Refresh = 25s (5s buffer).
        </Alert>

        {success && <Alert variant="success">✓ Configuration saved</Alert>}
        {error   && <Alert variant="error">{error}</Alert>}

        {configs.map(cfg => {
          const mess = MESS_DISPLAY[cfg.mess_id]
          return (
            <Card key={cfg.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>{mess.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {cfg.mess_id}
                  </div>
                </div>
                <button
                  onClick={() => updateConfig(cfg.id, 'is_enabled', !cfg.is_enabled)}
                  style={{
                    background:   cfg.is_enabled ? 'var(--green-dim)' : 'var(--red-dim)',
                    border:       `1px solid ${cfg.is_enabled ? 'var(--green-border)' : 'var(--red-border)'}`,
                    borderRadius: '0.5rem',
                    padding:      '0.3rem 0.8rem',
                    color:        cfg.is_enabled ? 'var(--green)' : 'var(--red)',
                    fontWeight:   700, fontSize: '0.75rem', cursor: 'pointer',
                  }}
                >
                  {cfg.is_enabled ? '● QR Enabled' : '○ QR Disabled'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[
                  { label: 'Token TTL (seconds)', field: 'token_ttl_secs', value: cfg.token_ttl_secs, min: 10, max: 120, hint: '10–120s' },
                  { label: 'Kiosk Refresh (seconds)', field: 'refresh_interval_secs', value: cfg.refresh_interval_secs, min: 5, max: 115, hint: 'Must be < TTL' },
                ].map(item => (
                  <div key={item.field}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700,
                      color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                      marginBottom: '0.4rem' }}>
                      {item.label}
                    </label>
                    <input
                      type="number"
                      min={item.min}
                      max={item.max}
                      defaultValue={item.value}
                      onBlur={e => {
                        const val = parseInt(e.target.value, 10)
                        if (!isNaN(val) && val !== item.value) {
                          updateConfig(cfg.id, item.field, val)
                        }
                      }}
                      style={{
                        width: '100%', padding: '0.6rem 0.75rem',
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                        fontSize: '1rem', fontFamily: 'monospace', fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {item.hint}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-high)',
                borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Kiosk URL:{' '}
                <code style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>
                  /kiosk/{cfg.mess_id}
                </code>
              </div>
            </Card>
          )
        })}

      </div>
    </>
  )
}
