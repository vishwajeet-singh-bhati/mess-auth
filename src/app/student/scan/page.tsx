'use client'
// app/(student)/scan/page.tsx — Paytm-style QR scanner

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AuthResponse } from '@/types/api'

type ScanPhase = 'scanning' | 'processing' | 'success' | 'denied'

const DENIAL_MESSAGES: Record<string, { title: string; hint: string }> = {
  wrong_mess:         { title: 'Wrong Mess',         hint: 'Your subscription is for a different mess.' },
  already_consumed:   { title: 'Already Eaten',      hint: 'You already had this meal today.' },
  outside_meal_hours: { title: 'Outside Meal Hours', hint: 'This meal slot is not active right now.' },
  blocked_student:    { title: 'Account Blocked',    hint: 'Contact the mess administrator.' },
  expired_qr:         { title: 'QR Expired',         hint: 'The QR refreshes every 30s. Try again.' },
  invalid_qr:         { title: 'Invalid QR',         hint: 'Make sure you are scanning the mess QR.' },
  invalid_token:      { title: 'Invalid Token',      hint: 'Make sure you are scanning the mess QR.' },
  no_subscription:    { title: 'No Subscription',    hint: 'You do not have an active mess subscription.' },
  qr_already_used:    { title: 'QR Already Used',    hint: 'The QR refreshes every 30s. Try again.' },
  student_not_found:  { title: 'Not Found',          hint: 'Your account is not set up. Contact admin.' },
}

export default function ScanPage() {
  const [phase, setPhase]             = useState<ScanPhase>('scanning')
  const [result, setResult]           = useState<AuthResponse | null>(null)
  const [torchOn, setTorchOn]         = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const videoRef      = useRef<HTMLVideoElement>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const rafRef        = useRef<number>(0)
  const mountedRef    = useRef(true)
  const processingRef = useRef(false)

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream
      const track = stream.getVideoTracks()[0]
      const caps = track.getCapabilities?.() as any
      if (caps?.torch) setTorchSupported(true)
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
    } catch (err: any) {
      setCameraError(err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow access in your browser settings.'
        : 'Could not open camera. Try refreshing the page.')
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    startCamera()
    return () => { mountedRef.current = false; stopCamera() }
  }, [startCamera, stopCamera])

  useEffect(() => {
    if (phase !== 'scanning') return
    let detector: any = null
    const BarcodeDetector = (window as any).BarcodeDetector

    const scan = async () => {
      if (!mountedRef.current || processingRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) { rafRef.current = requestAnimationFrame(scan); return }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0)
      try {
        let token: string | null = null
        if (detector) {
          const results = await detector.detect(canvas)
          if (results.length > 0) token = results[0].rawValue
        } else {
          // Fallback: use Html5Qrcode to decode from canvas
          const { Html5Qrcode } = await import('html5-qrcode')
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
          try {
            const result = await Html5Qrcode.scanFile(
              new File([await (await fetch(dataUrl)).blob()], 'frame.jpg', { type: 'image/jpeg' }),
              false
            )
            if (result) token = result
          } catch {}
        }
        if (token && !processingRef.current) {
          processingRef.current = true; stopCamera(); submitToken(token); return
        }
      } catch {}
      rafRef.current = requestAnimationFrame(scan)
    }

    const init = async () => {
      if (BarcodeDetector) detector = new BarcodeDetector({ formats: ['qr_code'] })
      scan()
    }
    init()
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, stopCamera])

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try { await (track as any).applyConstraints({ advanced: [{ torch: next }] }); setTorchOn(next) } catch {}
  }, [torchOn])

  const submitToken = useCallback(async (token: string) => {
    setPhase('processing')
    try {
      const res = await fetch('/api/auth/scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: token }),
      })
      const data: AuthResponse = await res.json()
      if (!mountedRef.current) return
      setResult(data); setPhase(data.success ? 'success' : 'denied')
    } catch {
      if (!mountedRef.current) return
      setResult({ success: false, reason: 'invalid_token', message: 'Network error. Please try again.' })
      setPhase('denied')
    }
  }, [])

  const reset = useCallback(() => {
    processingRef.current = false; setResult(null); setTorchOn(false)
    setPhase('scanning'); startCamera()
  }, [startCamera])

  return (
    <div style={{ position:'fixed', inset:0, background:'#000', display:'flex', flexDirection:'column', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <canvas ref={canvasRef} style={{ display:'none' }} />

      {/* Camera */}
      <div style={{ position:'absolute', inset:0, display: phase==='scanning' ? 'block' : 'none' }}>
        {cameraError
          ? <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'1rem', padding:'2rem', textAlign:'center' }}>
              <div style={{ fontSize:'3rem' }}>📷</div>
              <p style={{ color:'#fff', fontSize:'0.95rem', lineHeight:1.6, maxWidth:'280px' }}>{cameraError}</p>
            </div>
          : <video ref={videoRef} playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        }
      </div>

      {/* Scanner overlay */}
      {phase === 'scanning' && !cameraError && <>
        {/* Top bar */}
        <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'3rem 1.25rem 1rem', background:'linear-gradient(to bottom, rgba(0,0,0,0.72), transparent)' }}>
          <button onClick={() => window.history.back()} style={iconBtn}>←</button>
          <span style={{ color:'#fff', fontWeight:700, fontSize:'1rem' }}>Scan Mess QR</span>
          {torchSupported
            ? <button onClick={toggleTorch} style={{ ...iconBtn, background: torchOn ? '#facc15' : 'rgba(255,255,255,0.14)', color: torchOn ? '#000' : '#fff' }}>🔦</button>
            : <div style={{ width:40 }} />
          }
        </div>

        {/* Viewfinder */}
        <div style={{ flex:1, position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.52)', WebkitMaskImage:'radial-gradient(ellipse at center, transparent 130px, black 131px)', maskImage:'radial-gradient(ellipse at center, transparent 130px, black 131px)' }} />
          <div style={{ position:'relative', width:'260px', height:'260px' }}>
            {([[{top:0,left:0},{borderTop:'3px solid #fff',borderLeft:'3px solid #fff',borderRadius:'12px 0 0 0'}],
               [{top:0,right:0},{borderTop:'3px solid #fff',borderRight:'3px solid #fff',borderRadius:'0 12px 0 0'}],
               [{bottom:0,left:0},{borderBottom:'3px solid #fff',borderLeft:'3px solid #fff',borderRadius:'0 0 0 12px'}],
               [{bottom:0,right:0},{borderBottom:'3px solid #fff',borderRight:'3px solid #fff',borderRadius:'0 0 12px 0'}],
            ] as any[]).map(([pos, bdr], i) => (
              <div key={i} style={{ position:'absolute', width:'28px', height:'28px', ...pos, ...bdr }} />
            ))}
            <div style={{ position:'absolute', left:'4px', right:'4px', height:'2px', background:'linear-gradient(to right,transparent,#22c55e,transparent)', borderRadius:'2px', animation:'scanLine 2s ease-in-out infinite' }} />
          </div>
        </div>

        {/* Bottom hint */}
        <div style={{ position:'relative', zIndex:10, padding:'1.5rem 2rem 3.5rem', background:'linear-gradient(to top, rgba(0,0,0,0.75), transparent)', textAlign:'center' }}>
          <p style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.88rem', margin:0, lineHeight:1.6 }}>
            Point your camera at the QR code<br/>displayed at the mess entrance
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

      {/* Processing */}
      {phase === 'processing' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1.25rem' }}>
          <div style={{ width:'64px', height:'64px', borderRadius:'50%', border:'3px solid rgba(255,255,255,0.1)', borderTop:'3px solid #22c55e', animation:'spin 0.8s linear infinite' }} />
          <p style={{ color:'#fff', fontWeight:600, fontSize:'1rem', margin:0 }}>Verifying…</p>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.82rem', margin:0 }}>Checking your subscription</p>
          <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Success */}
      {phase === 'success' && result?.success && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0a0a0a', animation:'fadeUp 0.35s ease both' }}>
          <div style={{ background:'linear-gradient(135deg,#14532d,#166534)', padding:'3.5rem 2rem 2.5rem', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem' }}>
            <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.2rem', animation:'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>✓</div>
            <div>
              <div style={{ color:'#4ade80', fontSize:'1.75rem', fontWeight:900, letterSpacing:'-0.03em' }}>Authorized</div>
              <div style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.85rem', marginTop:'0.25rem' }}>Enjoy your meal!</div>
            </div>
          </div>
          <div style={{ flex:1, padding:'1.5rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {[
              { label:'Name',    value: result.data?.student_name },
              { label:'Roll No', value: result.data?.roll_number },
              { label:'Mess',    value: result.data?.mess_name },
              { label:'Meal',    value: result.data?.meal_type ? result.data.meal_type.charAt(0).toUpperCase()+result.data.meal_type.slice(1) : '' },
              { label:'Time',    value: result.data?.authorized_at ? new Date(result.data.authorized_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '' },
            ].map(({label,value}) => value ? (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.9rem 1rem', background:'#1a1a1a', borderRadius:'10px' }}>
                <span style={{ color:'#555', fontSize:'0.8rem', fontWeight:600 }}>{label}</span>
                <span style={{ color:'#fff', fontSize:'0.9rem', fontWeight:700 }}>{value}</span>
              </div>
            ) : null)}
          </div>
          <div style={{ padding:'1rem 1.5rem 2.5rem' }}>
            <button onClick={reset} style={resultBtn('#22c55e')}>Scan Again</button>
          </div>
        </div>
      )}

      {/* Denied */}
      {phase === 'denied' && !result?.success && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0a0a0a', animation:'fadeUp 0.35s ease both' }}>
          <div style={{ background:'linear-gradient(135deg,#450a0a,#7f1d1d)', padding:'3.5rem 2rem 2.5rem', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem' }}>
            <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.2rem', animation:'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>✕</div>
            <div>
              <div style={{ color:'#f87171', fontSize:'1.75rem', fontWeight:900, letterSpacing:'-0.03em' }}>{DENIAL_MESSAGES[result?.reason??'']?.title ?? 'Denied'}</div>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.85rem', marginTop:'0.25rem' }}>{DENIAL_MESSAGES[result?.reason??'']?.hint ?? result?.message}</div>
            </div>
          </div>
          <div style={{ flex:1, padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ background:'#1a1a1a', borderRadius:'12px', padding:'1.25rem', borderLeft:'3px solid #ef4444' }}>
              <div style={{ color:'#666', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Reason</div>
              <div style={{ color:'#fca5a5', fontSize:'0.9rem', lineHeight:1.6 }}>{result?.message}</div>
            </div>
            {(result?.reason==='expired_qr'||result?.reason==='qr_already_used') && (
              <div style={{ background:'#1a1a1a', borderRadius:'12px', padding:'1rem', display:'flex', gap:'0.75rem', alignItems:'flex-start' }}>
                <span>💡</span>
                <span style={{ color:'#777', fontSize:'0.83rem', lineHeight:1.5 }}>The entrance QR refreshes every 30 seconds. Wait for the new code and scan again.</span>
              </div>
            )}
          </div>
          <div style={{ padding:'1rem 1.5rem 2.5rem' }}>
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
  background:'rgba(255,255,255,0.13)', border:'none', borderRadius:'50%',
  width:'40px', height:'40px', color:'#fff', fontSize:'1.1rem', cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)',
  transition:'all 0.2s',
}

const resultBtn = (color: string): React.CSSProperties => ({
  width:'100%', padding:'1rem', background:color, border:'none',
  borderRadius:'14px', color:'#fff', fontWeight:700, fontSize:'1rem',
  cursor:'pointer', letterSpacing:'-0.01em',
})