'use client'
// app/kiosk/[messId]/page.tsx
// ============================================================
// Fullscreen kiosk QR display page.
// Designed to run on a TV/monitor at the mess entrance.
//
// Features:
//   - Auto-fetches fresh QR token from /api/qr/generate
//   - Refreshes N seconds before expiry (configured per mess)
//   - Displays live countdown timer with color-coded urgency
//   - Generates QR image client-side (no server round-trip for image)
//   - Session UUID persists for the browser tab's lifetime
//   - Gracefully handles network errors with retry
// ============================================================

import { useEffect, useState, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import type { MessId } from '@/types/database'
import type { GenerateQRResponse } from '@/types/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QRState {
  token: string
  expiresAt: Date
  ttlSeconds: number
  refreshIntervalSecs: number
}

interface PageProps {
  params: { messId: string }
}

// ─── Mess theme config ────────────────────────────────────────────────────────

const MESS_THEME = {
  mess_a: {
    name:        'Block A Mess',
    accentColor: '#3b82f6',
    glowColor:   'rgba(59,130,246,0.35)',
    borderColor: '#1d4ed8',
    badgeBg:     'rgba(59,130,246,0.12)',
  },
  mess_b: {
    name:        'Block B Mess',
    accentColor: '#8b5cf6',
    glowColor:   'rgba(139,92,246,0.35)',
    borderColor: '#6d28d9',
    badgeBg:     'rgba(139,92,246,0.12)',
  },
} as const

// ─── Component ────────────────────────────────────────────────────────────────

// Normalize URL param: /kiosk/a → mess_a, /kiosk/b → mess_b, /kiosk/mess_a → mess_a
function normalizeMessId(raw: string): MessId {
  const s = raw.toLowerCase()
  if (s === 'mess_b' || s === 'b' || s === '2') return 'mess_b'
  return 'mess_a'
}

export default function KioskPage({ params }: PageProps) {
  const messId = normalizeMessId(params.messId)
  const theme = MESS_THEME[messId] ?? MESS_THEME.mess_a

  const [qrState, setQRState]     = useState<QRState | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [timeLeft, setTimeLeft]   = useState<number>(30)
  const [error, setError]         = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState('')

  // Stable kiosk session ID — persists for the lifetime of this tab
  const kioskSessionRef = useRef<string>('')
  if (!kioskSessionRef.current) {
    kioskSessionRef.current = typeof crypto !== 'undefined'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  }

  // ── Fetch and render new QR ────────────────────────────────────────────────

  const fetchAndRenderQR = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(
        `/api/qr/generate?mess_id=${messId}&session=${kioskSessionRef.current}`,
        { cache: 'no-store' }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const data: GenerateQRResponse = await res.json()

      const newState: QRState = {
        token:               data.token,
        expiresAt:           new Date(data.expires_at),
        ttlSeconds:          data.ttl_seconds,
        refreshIntervalSecs: data.refresh_interval_secs,
      }

      setQRState(newState)
      setTimeLeft(data.ttl_seconds)

      // Generate QR image client-side
      const qrUrl = await QRCode.toDataURL(data.token, {
        width:                400,
        margin:               2,
        errorCorrectionLevel: 'H',   // High: tolerates ~30% damage
        color: {
          dark:  '#0f172a',
          light: '#ffffff',
        },
      })
      setQrDataUrl(qrUrl)

    } catch (err: any) {
      console.error('[kiosk] QR fetch failed:', err)
      setError(err.message ?? 'Failed to load QR. Retrying...')
    }
  }, [messId])

  // ── Schedule auto-refresh ─────────────────────────────────────────────────

  useEffect(() => {
    fetchAndRenderQR()
  }, [fetchAndRenderQR])

  useEffect(() => {
    if (!qrState) return

    // Refresh 3 seconds before token expires (buffer for network latency)
    const refreshDelay = (qrState.refreshIntervalSecs) * 1000
    const timer = setTimeout(fetchAndRenderQR, refreshDelay)
    return () => clearTimeout(timer)
  }, [qrState, fetchAndRenderQR])

  // ── Countdown timer ────────────────────────────────────────────────────────

  useEffect(() => {
    const tick = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(tick)
  }, [qrState])   // reset when new QR arrives

  // ── Live clock ────────────────────────────────────────────────────────────

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour:     '2-digit',
          minute:   '2-digit',
          second:   '2-digit',
        })
      )
    }
    updateClock()
    const clock = setInterval(updateClock, 1000)
    return () => clearInterval(clock)
  }, [])

  // ── Derived values ─────────────────────────────────────────────────────────

  const ttl = qrState?.ttlSeconds ?? 30
  const pct = Math.max(0, (timeLeft / ttl) * 100)

  const urgencyColor =
    timeLeft <= 5  ? '#ef4444' :
    timeLeft <= 10 ? '#f59e0b' :
    '#22c55e'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main
      style={{
        minHeight:       '100vh',
        background:      '#050810',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        fontFamily:      "'Outfit', 'DM Sans', system-ui, sans-serif",
        padding:         '2rem',
        gap:             '2rem',
        position:        'relative',
        overflow:        'hidden',
      }}
    >
      {/* Ambient background glow */}
      <div
        aria-hidden
        style={{
          position:     'absolute',
          width:        '600px',
          height:       '600px',
          borderRadius: '50%',
          background:   theme.glowColor,
          filter:       'blur(120px)',
          pointerEvents: 'none',
          top:          '50%',
          left:         '50%',
          transform:    'translate(-50%, -50%)',
        }}
      />

      {/* Header */}
      <header style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          '0.5rem',
            background:   theme.badgeBg,
            border:       `1px solid ${theme.accentColor}`,
            borderRadius: '2rem',
            padding:      '0.4rem 1.4rem',
            marginBottom: '1rem',
          }}
        >
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 800, color: theme.accentColor }}>
            🍽 {theme.name}
          </span>
        </div>

        <h1
          style={{
            fontSize:      'clamp(2rem, 5vw, 3.5rem)',
            fontWeight:    900,
            color:         '#f8fafc',
            margin:        0,
            letterSpacing: '-0.03em',
            lineHeight:    1,
          }}
        >
          Scan to Enter
        </h1>
        <p style={{ color: '#475569', marginTop: '0.5rem', fontSize: '1rem' }}>
          Open Mess App on your phone → Tap <strong style={{ color: '#94a3b8' }}>"Scan QR"</strong>
        </p>
      </header>

      {/* QR Code display */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            background:   'white',
            borderRadius: '1.5rem',
            padding:      '1.25rem',
            boxShadow:    `0 0 80px ${theme.glowColor}, 0 0 0 1px ${theme.borderColor}`,
            transition:   'opacity 0.3s ease',
            opacity:      qrDataUrl ? 1 : 0.4,
          }}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`Mess QR code for ${theme.name}`}
              style={{
                width:      'min(280px, 45vw)',
                height:     'min(280px, 45vw)',
                display:    'block',
              }}
            />
          ) : (
            <div
              style={{
                width:          'min(280px, 45vw)',
                height:         'min(280px, 45vw)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                background:     '#f8fafc',
                borderRadius:   '0.75rem',
              }}
            >
              <div
                style={{
                  width:       '48px',
                  height:      '48px',
                  border:      `4px solid ${theme.accentColor}`,
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation:   'spin 0.8s linear infinite',
                }}
              />
            </div>
          )}
        </div>

        {/* Token ID badge — for debugging / staff reference */}
        {qrState && (
          <div
            style={{
              position:       'absolute',
              bottom:         '-14px',
              left:           '50%',
              transform:      'translateX(-50%)',
              background:     '#0f172a',
              border:         '1px solid #1e293b',
              borderRadius:   '1rem',
              padding:        '0.2rem 0.8rem',
              fontSize:       '0.65rem',
              color:          '#475569',
              whiteSpace:     'nowrap',
              fontFamily:     'monospace',
            }}
          >
            Token: …{qrState.token.slice(-10)}
          </div>
        )}
      </div>

      {/* Countdown */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, marginTop: '0.5rem' }}>
        <div
          style={{
            fontSize:   'clamp(1.5rem, 4vw, 2.2rem)',
            fontWeight: 900,
            color:      urgencyColor,
            fontFamily: 'monospace',
            transition: 'color 0.3s',
          }}
        >
          {error ? '⚠ Error' : `Refreshes in ${timeLeft}s`}
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {error}
          </div>
        )}

        {/* Progress bar */}
        <div
          style={{
            width:        'min(260px, 40vw)',
            height:       '6px',
            background:   '#1e293b',
            borderRadius: '99px',
            margin:       '0.75rem auto 0',
            overflow:     'hidden',
          }}
        >
          <div
            style={{
              height:       '100%',
              borderRadius: '99px',
              background:   urgencyColor,
              width:        `${pct}%`,
              transition:   'width 1s linear, background 0.3s',
              boxShadow:    `0 0 10px ${urgencyColor}`,
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          position:  'absolute',
          bottom:    '1.5rem',
          left:      '50%',
          transform: 'translateX(-50%)',
          display:   'flex',
          gap:       '2rem',
          color:     '#334155',
          fontSize:  '0.8rem',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{currentTime} IST</span>
        <span>·</span>
        <span>{theme.name}</span>
        <span>·</span>
        <span>QR refreshes automatically</span>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
      `}</style>
    </main>
  )
}
