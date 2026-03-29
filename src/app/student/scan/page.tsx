'use client'
// app/(student)/scan/page.tsx

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AuthResponse } from '@/types/api'

type ScanPhase = 'loading' | 'scanning' | 'processing' | 'success' | 'warning' | 'denied'

const DENIAL_MESSAGES: Record<string, { title: string; hint: string }> = {
  wrong_mess:         { title: 'Wrong Mess',         hint: 'Your subscription is for a different mess.' },
  already_consumed:   { title: 'Already Eaten',      hint: 'You already had this meal today.' },
  outside_meal_hours: { title: 'Outside Meal Hours', hint: 'This meal slot is not active right now.' },
  blocked_student:    { title: 'Account Blocked',    hint: 'Contact the mess administrator.' },
  invalid_qr:         { title: 'Invalid QR',         hint: 'Make sure you are scanning the mess entrance QR.' },
  invalid_token:      { title: 'Invalid QR',         hint: 'Make sure you are scanning the mess entrance QR.' },
  no_subscription:    { title: 'No Subscription',    hint: 'You do not have an active mess subscription.' },
  student_not_found:  { title: 'Not Found',          hint: 'Your account is not set up. Contact admin.' },
}

// ─── Anti-screenshot animated QR pattern ────────────────────────────────────

function AnimatedQRPattern({ seed }: { seed: number }) {
  const size = 11
  // Generate a pseudo-random grid from the seed
  const grid: boolean[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      const v = Math.sin(seed * 9301 + r * 49297 + c * 233) * 49297
      return (v - Math.floor(v)) > 0.45
    })
  )

  return (
    <div style={{
      display: 'inline-grid',
      gridTemplateColumns: `repeat(${size}, 1fr)`,
      gap: '2px',
      padding: '10px',
      background: '#fff',
      borderRadius: '8px',
      width: '120px',
      height: '120px',
      animation: 'qrPulse 1.5s ease-in-out infinite',
    }}>
      {grid.flat().map((filled, i) => (
        <div key={i} style={{
          background: filled ? '#111' : '#fff',
          borderRadius: '1px',
        }} />
      ))}
      <style>{`
        @keyframes qrPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(0.97); }
        }
      `}</style>
    </div>
  )
}

export default function ScanPage() {
  const [phase, setPhase]           = useState<ScanPhase>('loading')
  const [result, setResult]         = useState<AuthResponse | null>(null)
  const [torchOn, setTorchOn]       = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  // Seed changes every render of success/warning to make pattern unique each time
  const [qrSeed, setQrSeed]         = useState(0)

  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const intervalRef   = useRef<any>(null)
  const mountedRef    = useRef(true)
  const detectedRef   = useRef(false)

  const stopCamera = () => {
    clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const submitToken = async (token: string) => {
    clearInterval(intervalRef.current)
    stopCamera()
    setPhase('processing')

    try {
      const res  = await fetch('/api/auth/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: token }),
      })
      const data: AuthResponse = await res.json()
      if (!mountedRef.current) return
      setResult(data)

      if (data.success) {
        // Generate a fresh random seed for the animated QR pattern
        setQrSeed(Date.now())
        // Show warning state if in grace period, otherwise normal success
        setPhase(data.data?.is_grace_period ? 'warning' : 'success')
      } else {
        setPhase('denied')
      }
    } catch {
      if (!mountedRef.current) return
      setResult({ success: false, reason: 'invalid_token', message: 'Network error. Please try again.' })
      setPhase('denied')
    }
  }

  const startScanning = useCallback(async () => {
    detectedRef.current = false
    setCameraError(null)

    if (!(window as any).jsQR) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
        s.onload  = () => resolve()
        s.onerror = () => {
          const s2 = document.createElement('script')
          s2.src = 'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js'
          s2.onload  = () => resolve()
          s2.onerror = () => reject()
          document.head.appendChild(s2)
        }
        document.head.appendChild(s)
      }).catch(() => {
        setCameraError('Failed to load QR scanner. Check your internet connection.')
        setPhase('scanning')
        return
      })
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream

      const track = stream.getVideoTracks()[0]
      const caps  = (track.getCapabilities?.() as any)
      if (caps?.torch) setTorchSupported(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setPhase('scanning')

      intervalRef.current = setInterval(() => {
        if (detectedRef.current) return
        const video  = videoRef.current
        const canvas = canvasRef.current
        const jsQR   = (window as any).jsQR
        if (!video || !canvas || !jsQR || video.readyState < 2 || video.videoWidth === 0) return
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const decoded   = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })
        if (decoded?.data) {
          detectedRef.current = true
          submitToken(decoded.data)
        }
      }, 200)

    } catch (err: any) {
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Could not open camera. Try refreshing the page.'
      )
      setPhase('scanning')
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    startScanning()
    return () => {
      mountedRef.current = false
      stopCamera()
    }
  }, [startScanning])

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try { await (track as any).applyConstraints({ advanced: [{ torch: next }] }); setTorchOn(next) } catch {}
  }

  const reset = () => {
    stopCamera()
    setResult(null)
    setTorchOn(false)
    setTorchSupported(false)
    setPhase('loading')
    detectedRef.current = false
    setTimeout(() => { if (mountedRef.current) startScanning() }, 200)
  }

  // ── Shared info rows for success/warning ──────────────────────────────────
  const InfoRows = ({ data }: { data: NonNullable<AuthResponse['data']> }) => (
    <>
      {[
        { label: 'Name',    value: data.student_name },
        { label: 'Roll No', value: data.roll_number },
        { label: 'Mess',    value: data.mess_name },
        { label: 'Meal',    value: data.meal_type
            ? data.meal_type.charAt(0).toUpperCase() + data.meal_type.slice(1) : '' },
        { label: 'Time',    value: data.authorized_at
            ? new Date(data.authorized_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '' },
      ].map(({ label, value }) => value ? (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.9rem 1rem', background: '#1a1a1a', borderRadius: '10px' }}>
          <span style={{ color: '#555', fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
          <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700 }}>{value}</span>
        </div>
      ) : null)}
    </>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Camera */}
      <div style={{
        position: 'absolute', inset: 0,
        display: (phase === 'scanning' || phase === 'loading') ? 'block' : 'none',
      }}>
        {cameraError
          ? <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem' }}>📷</div>
              <p style={{ color: '#fff', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '280px' }}>{cameraError}</p>
            </div>
          : <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        }
      </div>

      {/* Loading */}
      {phase === 'loading' && (
        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.15)', borderTop: '3px solid #fff',
            animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>Starting camera…</p>
          <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Scanning UI */}
      {phase === 'scanning' && !cameraError && <>
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '3rem 1.25rem 1rem',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)' }}>
          <button onClick={() => window.history.back()} style={iconBtn}>←</button>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>Scan Mess QR</span>
          {torchSupported
            ? <button onClick={toggleTorch} style={{ ...iconBtn,
                background: torchOn ? '#facc15' : 'rgba(255,255,255,0.14)',
                color: torchOn ? '#000' : '#fff' }}>🔦</button>
            : <div style={{ width: 40 }} />}
        </div>

        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '260px', height: '260px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', borderRadius: '4px' }}>
            {[
              { top: 0,    left: 0,   borderTop: '3px solid #fff', borderLeft: '3px solid #fff',    borderTopLeftRadius: '4px' },
              { top: 0,    right: 0,  borderTop: '3px solid #fff', borderRight: '3px solid #fff',   borderTopRightRadius: '4px' },
              { bottom: 0, left: 0,   borderBottom: '3px solid #fff', borderLeft: '3px solid #fff', borderBottomLeftRadius: '4px' },
              { bottom: 0, right: 0,  borderBottom: '3px solid #fff', borderRight: '3px solid #fff',borderBottomRightRadius: '4px' },
            ].map((s, i) => <div key={i} style={{ position: 'absolute', width: '28px', height: '28px', ...s }} />)}
            <div style={{ position: 'absolute', left: '4px', right: '4px', height: '2px',
              background: 'linear-gradient(to right, transparent, #22c55e, transparent)',
              borderRadius: '2px', animation: 'scanLine 2s ease-in-out infinite' }} />
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 10, padding: '1.5rem 2rem 3.5rem',
          background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
            Point your camera at the QR code<br />displayed at the mess entrance
          </p>
        </div>

        <style>{`
          @keyframes scanLine {
            0%   { top:8px; opacity:0; }
            10%  { opacity:1; }
            90%  { opacity:1; }
            100% { top:calc(100% - 10px); opacity:0; }
          }
        `}</style>
      </>}

      {phase === 'scanning' && cameraError && (
        <div style={{ position: 'relative', zIndex: 10, padding: '3rem 1.25rem 1rem' }}>
          <button onClick={() => window.history.back()} style={iconBtn}>←</button>
        </div>
      )}

      {/* Processing */}
      {phase === 'processing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '1.25rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #22c55e',
            animation: 'spin2 0.8s linear infinite' }} />
          <p style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', margin: 0 }}>Verifying…</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', margin: 0 }}>Checking your subscription</p>
          <style>{`@keyframes spin2 { to { transform:rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {phase === 'success' && result?.success && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0a0a', animation: 'fadeUp 0.35s ease both' }}>
          <div style={{ background: 'linear-gradient(135deg,#14532d,#166534)', padding: '3rem 2rem 2rem',
            textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            {/* Anti-screenshot animated QR */}
            <AnimatedQRPattern seed={qrSeed} />
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
              animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>✓</div>
            <div>
              <div style={{ color: '#4ade80', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em' }}>Authorized</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Enjoy your meal!</div>
            </div>
          </div>
          <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <InfoRows data={result.data!} />
          </div>
          <div style={{ padding: '1rem 1.5rem 2.5rem' }}>
            <button onClick={reset} style={resultBtn('#22c55e')}>Scan Again</button>
          </div>
        </div>
      )}

      {/* ── WARNING (grace period — entry granted but outside strict hours) ── */}
      {phase === 'warning' && result?.success && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0a0a', animation: 'fadeUp 0.35s ease both' }}>
          <div style={{ background: 'linear-gradient(135deg,#431407,#92400e)', padding: '3rem 2rem 2rem',
            textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            {/* Anti-screenshot animated QR */}
            <AnimatedQRPattern seed={qrSeed} />
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
              animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>⚠️</div>
            <div>
              <div style={{ color: '#fb923c', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em' }}>Entry Granted</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {result.data?.grace_type === 'early'
                  ? 'You are early — meal slot hasn\'t started yet'
                  : 'You are late — meal slot has ended'}
              </div>
            </div>
          </div>
          {/* Warning banner */}
          <div style={{ margin: '1rem 1.5rem 0', background: '#1c1004', border: '1px solid #92400e',
            borderRadius: '12px', padding: '0.9rem 1rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>⏰</span>
            <span style={{ color: '#fdba74', fontSize: '0.82rem', lineHeight: 1.5 }}>
              You are outside regular meal hours but entry has been granted as a courtesy.
              Please try to arrive on time in the future.
            </span>
          </div>
          <div style={{ flex: 1, padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <InfoRows data={result.data!} />
          </div>
          <div style={{ padding: '1rem 1.5rem 2.5rem' }}>
            <button onClick={reset} style={resultBtn('#f97316')}>Scan Again</button>
          </div>
        </div>
      )}

      {/* ── DENIED ── */}
      {phase === 'denied' && !result?.success && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0a0a', animation: 'fadeUp 0.35s ease both' }}>
          <div style={{ background: 'linear-gradient(135deg,#450a0a,#7f1d1d)', padding: '3.5rem 2rem 2.5rem',
            textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem',
              animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>✕</div>
            <div>
              <div style={{ color: '#f87171', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
                {DENIAL_MESSAGES[result?.reason ?? '']?.title ?? 'Denied'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {DENIAL_MESSAGES[result?.reason ?? '']?.hint ?? result?.message}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '1.25rem', borderLeft: '3px solid #ef4444' }}>
              <div style={{ color: '#666', fontSize: '0.72rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Reason</div>
              <div style={{ color: '#fca5a5', fontSize: '0.9rem', lineHeight: 1.6 }}>{result?.message}</div>
            </div>
          </div>
          <div style={{ padding: '1rem 1.5rem 2.5rem' }}>
            <button onClick={reset} style={resultBtn('#ef4444')}>Try Again</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn  { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
      `}</style>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.13)', border: 'none', borderRadius: '50%',
  width: '40px', height: '40px', color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
}

const resultBtn = (color: string): React.CSSProperties => ({
  width: '100%', padding: '1rem', background: color, border: 'none',
  borderRadius: '14px', color: '#fff', fontWeight: 700, fontSize: '1rem',
  cursor: 'pointer', letterSpacing: '-0.01em',
})