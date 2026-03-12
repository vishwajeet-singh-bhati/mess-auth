'use client'
// app/(student)/scan/page.tsx
// Full QR scan flow: camera → server validation → green/red result

import { useState, useEffect, useRef, useCallback } from 'react'
import { TopBar } from '@/components/shared/TopBar'
import { Button, Spinner, Alert } from '@/components/shared/ui'
import type { AuthResponse } from '@/types/api'

type ScanPhase =
  | 'idle'          // waiting for user to start
  | 'requesting'    // requesting camera permission
  | 'scanning'      // camera active, scanning
  | 'processing'    // token sent to server
  | 'success'       // authorized ✓
  | 'denied'        // denied ✗

const DENIAL_ICONS: Record<string, string> = {
  wrong_mess:          '🚫',
  already_consumed:    '✓',
  outside_meal_hours:  '🕐',
  blocked_student:     '🔒',
  expired_qr:          '⏰',
  invalid_qr:          '❌',
  invalid_token:       '❌',
  no_subscription:     '📋',
  qr_already_used:     '🔄',
  student_not_found:   '❓',
}

export default function ScanPage() {
  const [phase, setPhase]         = useState<ScanPhase>('idle')
  const [result, setResult]       = useState<AuthResponse | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scannedToken, setScannedToken] = useState<string | null>(null)

  const videoRef     = useRef<HTMLVideoElement>(null)
  const streamRef    = useRef<MediaStream | null>(null)
  const scannerRef   = useRef<any>(null)   // Html5QrcodeScanner instance
  const mountedRef   = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopCamera()
    }
  }, [])

  // ── Camera helpers ──────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (scannerRef.current) {
      try { scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
  }, [])

  // ── Start scanning using html5-qrcode ──────────────────────────────────────

  const startScanner = useCallback(async () => {
    setPhase('requesting')
    setCameraError(null)

    // Dynamically import html5-qrcode (client-only)
    let Html5QrcodeScanner: any
    try {
      const mod = await import('html5-qrcode')
      Html5QrcodeScanner = mod.Html5QrcodeScanner
    } catch {
      setCameraError('QR scanner library failed to load.')
      setPhase('idle')
      return
    }

    setPhase('scanning')

    // Small delay so the DOM element renders
    await new Promise(r => setTimeout(r, 100))

    const onScanSuccess = (decodedText: string) => {
      if (!mountedRef.current) return
      stopCamera()
      setScannedToken(decodedText)
      submitToken(decodedText)
    }

    const onScanFailure = () => {
      // Silently ignore — fires frequently on non-QR frames
    }

    try {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps:            10,
          qrbox:          { width: 240, height: 240 },
          aspectRatio:    1.0,
          showTorchButtonIfSupported: true,
          rememberLastUsedCamera: true,
        },
        false  // verbose: false
      )
      scanner.render(onScanSuccess, onScanFailure)
      scannerRef.current = scanner
    } catch (err: any) {
      setCameraError(err?.message ?? 'Camera failed to start.')
      setPhase('idle')
    }
  }, [stopCamera])

  // ── Submit token to server ──────────────────────────────────────────────────

  const submitToken = useCallback(async (token: string) => {
    setPhase('processing')

    try {
      const res = await fetch('/api/auth/scan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ qr_token: token }),
      })

      const data: AuthResponse = await res.json()

      if (!mountedRef.current) return
      setResult(data)
      setPhase(data.success ? 'success' : 'denied')
    } catch {
      if (!mountedRef.current) return
      setResult({
        success: false,
        reason:  'invalid_token',
        message: 'Network error. Please check your connection and try again.',
      })
      setPhase('denied')
    }
  }, [])

  // ── Reset ───────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setPhase('idle')
    setResult(null)
    setScannedToken(null)
    setCameraError(null)
  }, [])

  // ── Render phases ───────────────────────────────────────────────────────────

  return (
    <>
      <TopBar title="Scan Mess QR" back subtitle="Authorize your meal" />

      <div style={{ padding: '1.25rem', paddingBottom: '2rem' }}>

        {/* ── IDLE ─────────────────────────────────────────────────── */}
        {phase === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              background:   'var(--surface)',
              border:       '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding:      '2rem 1.5rem',
              textAlign:    'center',
              display:      'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: 'var(--radius-lg)',
                background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem',
              }}>
                📷
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  Ready to Scan
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
                  Stand at the mess entrance and tap below to open your camera.
                  Then point it at the QR code displayed on the screen.
                </div>
              </div>
            </div>

            {cameraError && <Alert variant="error">{cameraError}</Alert>}

            <Button fullWidth size="lg" onClick={startScanner}>
              Open Camera & Scan
            </Button>

            <div style={{
              background:   'var(--surface)',
              border:       '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding:      '1rem',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                How it works
              </div>
              {[
                ['📺', 'Look at the QR code on the mess entrance screen'],
                ['📷', 'Tap the button above to open your camera'],
                ['⚡', 'Point at the QR — authorization happens instantly'],
                ['✅', 'Green screen = you can enter; Red = see reason'],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.6rem',
                  alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── REQUESTING PERMISSION ─────────────────────────────────── */}
        {phase === 'requesting' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '300px', gap: '1rem', textAlign: 'center' }}>
            <Spinner size={40} />
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>Requesting camera…</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Please allow camera access when prompted
            </div>
          </div>
        )}

        {/* ── SCANNING ─────────────────────────────────────────────── */}
        {phase === 'scanning' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background:   'var(--surface)',
              border:       '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow:     'hidden',
            }}>
              {/* html5-qrcode mounts into this div */}
              <div
                id="qr-reader"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <Spinner size={14} />
              <span>Scanning for QR code…</span>
            </div>

            <Button variant="secondary" fullWidth onClick={() => { stopCamera(); reset() }}>
              Cancel
            </Button>
          </div>
        )}

        {/* ── PROCESSING ───────────────────────────────────────────── */}
        {phase === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '300px', gap: '1rem', textAlign: 'center' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Spinner size={28} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>Verifying…</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                Checking your subscription and meal slot
              </div>
            </div>
          </div>
        )}

        {/* ── SUCCESS ──────────────────────────────────────────────── */}
        {phase === 'success' && result?.success && (
          <SuccessScreen data={result.data} onReset={reset} />
        )}

        {/* ── DENIED ───────────────────────────────────────────────── */}
        {phase === 'denied' && !result?.success && result && (
          <DeniedScreen reason={result.reason} message={result.message} onReset={reset} />
        )}

      </div>
    </>
  )
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ data, onReset }: { data: any; onReset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
      {/* Big checkmark */}
      <div style={{
        background:     'var(--green-bg)',
        border:         '1px solid var(--green-border)',
        borderRadius:   'var(--radius-xl)',
        padding:        '2rem 1.5rem',
        display:        'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
        boxShadow:      '0 0 60px rgba(34,197,94,0.15)',
      }}>
        <div style={{
          width:        '88px', height: '88px', borderRadius: '50%',
          background:   'rgba(34,197,94,0.15)', border: '2px solid var(--green)',
          display:      'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow:    '0 0 40px rgba(34,197,94,0.3)',
          fontSize:     '2.5rem',
        }}>
          ✓
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--green)',
            letterSpacing: '-0.03em', lineHeight: 1 }}>
            AUTHORIZED
          </div>
          <div style={{ fontSize: '0.85rem', color: '#86efac', marginTop: '0.3rem' }}>
            Meal access granted — enjoy your meal!
          </div>
        </div>
      </div>

      {/* Details */}
      <div style={{
        background:   'var(--surface)', border: '1px solid var(--green-border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        {[
          { label: 'Student',    value: data.student_name },
          { label: 'Roll No.',   value: data.roll_number },
          { label: 'Mess',       value: data.mess_name },
          { label: 'Meal',       value: data.meal_type.charAt(0).toUpperCase() + data.meal_type.slice(1) },
          { label: 'Time',       value: new Date(data.authorized_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) },
          { label: 'Method',     value: data.method === 'qr_scan' ? 'QR Scan' : 'Manual Entry' },
        ].map((row, i, arr) => (
          <div key={row.label} style={{
            display:       'flex', justifyContent: 'space-between', alignItems: 'center',
            padding:       '0.7rem 1rem',
            borderBottom:  i < arr.length - 1 ? '1px solid rgba(22,163,74,0.15)' : 'none',
          }}>
            <span style={{ fontSize: '0.78rem', color: '#86efac80', fontWeight: 600 }}>{row.label}</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#bbf7d0' }}>{row.value}</span>
          </div>
        ))}
      </div>

      <Button variant="success" fullWidth onClick={onReset}>
        ← Back to Scan
      </Button>
    </div>
  )
}

// ─── Denied Screen ────────────────────────────────────────────────────────────

function DeniedScreen({ reason, message, onReset }: { reason: string; message: string; onReset: () => void }) {
  const icon = DENIAL_ICONS[reason] ?? '✗'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
      <div style={{
        background:   'var(--red-bg)', border: '1px solid var(--red-border)',
        borderRadius: 'var(--radius-xl)', padding: '2rem 1.5rem',
        display:      'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
        boxShadow:    '0 0 60px rgba(239,68,68,0.12)',
      }}>
        <div style={{
          width:     '88px', height: '88px', borderRadius: '50%',
          background: 'rgba(239,68,68,0.12)', border: '2px solid var(--red)',
          display:   'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(239,68,68,0.25)', fontSize: '2.2rem',
        }}>
          {icon}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--red)',
            letterSpacing: '-0.03em', lineHeight: 1 }}>
            DENIED
          </div>
          <div style={{
            display: 'inline-block', marginTop: '0.5rem',
            background: 'rgba(239,68,68,0.15)', border: '1px solid var(--red-border)',
            borderRadius: '0.4rem', padding: '0.2rem 0.75rem',
            fontSize: '0.7rem', fontWeight: 800, color: '#fca5a5',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            {reason.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      <div style={{
        background:   'var(--surface)', border: '1px solid var(--red-border)',
        borderRadius: 'var(--radius-lg)', padding: '1.25rem',
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          Reason
        </div>
        <p style={{ color: '#fca5a5', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
          {message}
        </p>
      </div>

      {reason === 'expired_qr' || reason === 'qr_already_used' ? (
        <div style={{
          background: 'var(--surface-high)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
          fontSize: '0.82rem', color: 'var(--text-dim)', display: 'flex', gap: '0.5rem',
        }}>
          <span>💡</span>
          <span>The QR at the entrance refreshes every 30 seconds. Try scanning the new code.</span>
        </div>
      ) : null}

      <Button variant="danger" fullWidth onClick={onReset}>
        ← Try Again
      </Button>
    </div>
  )
}
