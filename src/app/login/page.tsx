'use client'
// app/login/page.tsx — Brutalist Dark

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database'

export const dynamic = 'force-dynamic'

const ROLE_HOME: Record<UserRole, string> = {
  student: '/student/dashboard',
  staff:   '/staff/dashboard',
  admin:   '/admin/dashboard',
}

const HOSTELS = ['MVHR', 'Kalam', 'SRK', 'Kalpana']
const WINGS   = ['Wing A', 'Wing B']

type Mode = 'select' | 'student-login' | 'student-signup' | 'student-otp' | 'staff-login'

function LoginContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect')
  const supabase     = createClient()

  const [mode, setMode]       = useState<Mode>('select')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName]       = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPass, setSignupPass]   = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [rollNumber, setRollNumber]   = useState('')
  const [hostel, setHostel]           = useState('')
  const [wing, setWing]               = useState('')
  const [roomNumber, setRoomNumber]   = useState('')
  const [otp, setOtp]                 = useState(['', '', '', ''])
  const [otpCooldown, setOtpCooldown] = useState(0)

  const otpRefs = [
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
  ]

  useEffect(() => {
    if (otpCooldown <= 0) return
    const t = setTimeout(() => setOtpCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [otpCooldown])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const role = user.user_metadata?.role as UserRole | undefined
        router.replace(redirectTo ?? (role ? ROLE_HOME[role] : '/'))
      }
    })
  }, [])

  const reset = () => {
    setError(null); setSuccess(null)
    setEmail(''); setPassword('')
    setFullName(''); setSignupEmail(''); setSignupPass('')
    setConfirmPass(''); setRollNumber(''); setHostel(''); setWing(''); setRoomNumber('')
    setOtp(['', '', '', '']); setOtpCooldown(0)
  }
  const goTo = (m: Mode) => { reset(); setMode(m) }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null)
    if (!email.endsWith('@iiitk.ac.in')) { setError('Only @iiitk.ac.in addresses allowed.'); setLoading(false); return }
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (err) { setError(err.message); setLoading(false); return }
    const role = data.user?.user_metadata?.role as UserRole | undefined
    router.push(redirectTo ?? (role ? ROLE_HOME[role] : '/'))
    router.refresh()
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null)
    if (!signupEmail.endsWith('@iiitk.ac.in')) { setError('Only @iiitk.ac.in addresses allowed.'); setLoading(false); return }
    if (signupPass !== confirmPass) { setError('Passwords do not match.'); setLoading(false); return }
    if (signupPass.length < 8) { setError('Password must be at least 8 characters.'); setLoading(false); return }
    if (!fullName.trim()) { setError('Full name is required.'); setLoading(false); return }
    if (!rollNumber.trim()) { setError('Roll number is required.'); setLoading(false); return }
    if (!hostel) { setError('Please select your hostel.'); setLoading(false); return }
    if (hostel !== 'SRK' && !wing) { setError('Please select your wing.'); setLoading(false); return }
    if (!roomNumber.trim()) { setError('Room number is required.'); setLoading(false); return }
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: signupEmail.trim().toLowerCase() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to send OTP.'); setLoading(false); return }
    setLoading(false); setOtp(['', '', '', '']); setOtpCooldown(60)
    setMode('student-otp')
    setTimeout(() => otpRefs[0].current?.focus(), 100)
  }

  const handleResendOtp = async () => {
    if (otpCooldown > 0) return
    setError(null); setOtpCooldown(60)
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: signupEmail.trim().toLowerCase() }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Failed to resend OTP.')
    else setOtp(['', '', '', ''])
  }

  const handleOtpChange = (i: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const n = [...otp]; n[i] = value.slice(-1); setOtp(n)
    if (value && i < 3) otpRefs[i + 1].current?.focus()
  }
  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus()
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpValue = otp.join('')
    if (otpValue.length !== 4) { setError('Enter all 4 digits.'); return }
    setLoading(true); setError(null)
    const res = await fetch('/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: signupEmail.trim().toLowerCase(), password: signupPass,
        full_name: fullName.trim(), roll_number: rollNumber.trim(),
        hostel, wing: hostel === 'SRK' ? undefined : wing,
        room_number: roomNumber.trim(), otp: otpValue,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); setLoading(false); return }
    setSuccess('Account created! You can now sign in.')
    setLoading(false)
    setTimeout(() => goTo('student-login'), 2000)
  }

  // Shared styles
  const inp: React.CSSProperties = {
    width: '100%', padding: '0.8rem 1rem',
    background: '#111', border: '1px solid #2e2e2e',
    borderRadius: '8px', color: '#fff',
    fontSize: '0.9rem', outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.7rem', color: '#888',
    fontWeight: 600, marginBottom: '0.4rem',
    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
  }
  const btnPrimary: React.CSSProperties = {
    width: '100%', background: '#fff', color: '#000',
    border: '1px solid #fff', borderRadius: '8px',
    padding: '0.85rem', fontSize: '0.9rem', fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '-0.01em',
    transition: 'opacity 0.15s',
  }
  const card: React.CSSProperties = {
    background: '#0a0a0a', border: '1px solid #1e1e1e',
    borderRadius: '12px', padding: '1.75rem',
  }
  const backBtn: React.CSSProperties = {
    background: 'none', border: '1px solid #2e2e2e',
    borderRadius: '6px', width: '30px', height: '30px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#888', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0,
  }

  return (
    <main style={{
      minHeight: '100dvh', background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      padding: '1.5rem 1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '390px' }}>

        {/* Logo */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: '2rem', fontWeight: 400,
            color: '#fff', letterSpacing: '-0.02em',
            marginBottom: '0.25rem',
          }}>Mess Auth</div>
          <div style={{ fontSize: '0.78rem', color: '#666',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace" }}>
            IIITDM Kurnool · Hostel Portal
          </div>
        </div>

        {/* ROLE SELECT */}
        {mode === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#666', letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: '0.5rem',
              fontFamily: "'JetBrains Mono', monospace" }}>
              Select role
            </div>
            {[
              { mode: 'student-login' as Mode, label: 'Student', sub: 'Login or create an account' },
              { mode: 'staff-login'   as Mode, label: 'Staff / Admin', sub: 'Authorized personnel only' },
            ].map(item => (
              <button key={item.mode} onClick={() => goTo(item.mode)} style={{
                background: '#0a0a0a', border: '1px solid #1e1e1e',
                borderRadius: '10px', padding: '1.1rem 1.25rem',
                cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '1rem',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a3a'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e1e'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem',
                    fontFamily: "'DM Serif Display', Georgia, serif" }}>
                    {item.label}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                    {item.sub}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#333" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* STUDENT LOGIN */}
        {mode === 'student-login' && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button onClick={() => goTo('select')} style={backBtn}>←</button>
              <div style={{ fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: '1.1rem', color: '#fff' }}>Student Login</div>
            </div>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={lbl}>Institute Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="yourname@iiitk.ac.in" style={inp} />
              </div>
              <div>
                <label style={lbl}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••" style={inp} />
              </div>
              {error && <Msg text={error} type="error" />}
              <button type="submit" disabled={loading} style={btnPrimary}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <p style={{ marginTop: '1.25rem', fontSize: '0.82rem', color: '#666' }}>
              No account?{' '}
              <button onClick={() => goTo('student-signup')} style={{
                background: 'none', border: 'none', color: '#ccc',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: 0,
                textDecoration: 'underline', textUnderlineOffset: '3px',
              }}>Create one</button>
            </p>
          </div>
        )}

        {/* STUDENT SIGNUP */}
        {mode === 'student-signup' && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button onClick={() => goTo('student-login')} style={backBtn}>←</button>
              <div style={{ fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: '1.1rem', color: '#fff' }}>Create Account</div>
            </div>
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={lbl}>Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  required placeholder="Your full name" style={inp} />
              </div>
              <div>
                <label style={lbl}>Roll Number</label>
                <input type="text" value={rollNumber} onChange={e => setRollNumber(e.target.value)}
                  required placeholder="e.g. CS23B001" style={inp} />
              </div>
              <div>
                <label style={lbl}>Institute Email</label>
                <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                  required placeholder="yourname@iiitk.ac.in" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: hostel === 'SRK' ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>Hostel</label>
                  <select value={hostel} onChange={e => { setHostel(e.target.value); setWing('') }}
                    required style={{ ...inp, appearance: 'none' } as React.CSSProperties}>
                    <option value="">Select</option>
                    {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                {hostel && hostel !== 'SRK' && (
                  <div>
                    <label style={lbl}>Wing</label>
                    <select value={wing} onChange={e => setWing(e.target.value)}
                      required style={{ ...inp, appearance: 'none' } as React.CSSProperties}>
                      <option value="">Select</option>
                      {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Room Number</label>
                <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)}
                  required placeholder="e.g. 204" style={inp} />
              </div>
              <div>
                <label style={lbl}>Password</label>
                <input type="password" value={signupPass} onChange={e => setSignupPass(e.target.value)}
                  required placeholder="Min. 8 characters" style={inp} />
              </div>
              <div>
                <label style={lbl}>Confirm Password</label>
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                  required placeholder="Re-enter password" style={inp} />
              </div>
              {error && <Msg text={error} type="error" />}
              <button type="submit" disabled={loading} style={btnPrimary}>
                {loading ? 'Sending OTP…' : 'Send OTP to Email'}
              </button>
            </form>
            <p style={{ marginTop: '1.25rem', fontSize: '0.82rem', color: '#666' }}>
              Already have an account?{' '}
              <button onClick={() => goTo('student-login')} style={{
                background: 'none', border: 'none', color: '#ccc',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: 0,
                textDecoration: 'underline', textUnderlineOffset: '3px',
              }}>Sign In</button>
            </p>
          </div>
        )}

        {/* OTP VERIFY */}
        {mode === 'student-otp' && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button onClick={() => goTo('student-signup')} style={backBtn}>←</button>
              <div style={{ fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: '1.1rem', color: '#fff' }}>Verify Email</div>
            </div>
            <div style={{ background: '#111', border: '1px solid #2e2e2e',
              borderRadius: '8px', padding: '0.9rem 1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.68rem', color: '#888', fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                OTP sent to
              </div>
              <div style={{ fontSize: '0.88rem', color: '#fff',
                fontFamily: "'JetBrains Mono', monospace" }}>{signupEmail}</div>
              <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '0.25rem' }}>
                Valid for 10 minutes
              </div>
            </div>
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ ...lbl, textAlign: 'center' as const, display: 'block', marginBottom: '0.75rem' }}>
                  Enter 4-digit OTP
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric"
                      maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      style={{
                        width: '62px', height: '64px', textAlign: 'center',
                        fontSize: '1.75rem', fontWeight: 700, color: '#fff',
                        background: digit ? '#1a1a1a' : '#111',
                        border: `1px solid ${digit ? '#fff' : '#2e2e2e'}`,
                        borderRadius: '8px', outline: 'none',
                        fontFamily: "'DM Serif Display', Georgia, serif",
                        transition: 'all 0.12s',
                        boxSizing: 'border-box',
                      }}
                    />
                  ))}
                </div>
              </div>
              {error   && <Msg text={error} type="error" />}
              {success && <Msg text={success} type="success" />}
              <button type="submit"
                disabled={loading || otp.join('').length !== 4}
                style={{ ...btnPrimary, opacity: (loading || otp.join('').length !== 4) ? 0.4 : 1 }}>
                {loading ? 'Verifying…' : 'Verify & Create Account'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: '#666' }}>
              {otpCooldown > 0 ? (
                <>Resend in <span style={{ color: '#ccc',
                  fontFamily: "'JetBrains Mono', monospace" }}>{otpCooldown}s</span></>
              ) : (
                <button onClick={handleResendOtp} style={{
                  background: 'none', border: 'none', color: '#ccc',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: 0,
                  textDecoration: 'underline', textUnderlineOffset: '3px',
                }}>Resend OTP</button>
              )}
            </div>
          </div>
        )}

        {/* STAFF / ADMIN */}
        {mode === 'staff-login' && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button onClick={() => goTo('select')} style={backBtn}>←</button>
              <div style={{ fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: '1.1rem', color: '#fff' }}>Staff / Admin</div>
            </div>
            <div style={{ background: '#111', border: '1px solid #2e2e2e',
              borderRadius: '8px', padding: '0.7rem 1rem', marginBottom: '1.25rem',
              fontSize: '0.8rem', color: '#888' }}>
              Authorized personnel only
            </div>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={lbl}>Institute Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="yourname@iiitk.ac.in" style={inp} />
              </div>
              <div>
                <label style={lbl}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••" style={inp} />
              </div>
              {error && <Msg text={error} type="error" />}
              <button type="submit" disabled={loading} style={btnPrimary}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        {mode !== 'select' && (
          <p style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button onClick={() => goTo('select')} style={{
              background: 'none', border: 'none', color: '#444',
              cursor: 'pointer', fontSize: '0.78rem', padding: 0,
            }}>← Back to role selection</button>
          </p>
        )}

      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        input::placeholder { color: #444; }
        select option { background: #111; color: #fff; }
        input:focus, select:focus { border-color: #fff !important; }
        * { box-sizing: border-box; }
      `}</style>
    </main>
  )
}

function Msg({ text, type }: { text: string; type: 'error' | 'success' }) {
  return (
    <div style={{
      background: '#111', border: '1px solid #2e2e2e',
      borderLeft: `3px solid ${type === 'error' ? '#555' : '#888'}`,
      borderRadius: '6px', padding: '0.65rem 0.9rem',
      color: type === 'error' ? '#ccc' : '#ccc',
      fontSize: '0.82rem', lineHeight: 1.4,
    }}>{text}</div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#000' }} />}>
      <LoginContent />
    </Suspense>
  )
}