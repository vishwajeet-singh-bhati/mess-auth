'use client'
// app/login/page.tsx — Premium Dark Redesign

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
    e.preventDefault()
    setLoading(true); setError(null)
    if (!email.endsWith('@iiitk.ac.in')) {
      setError('Only @iiitk.ac.in addresses allowed.')
      setLoading(false); return
    }
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password,
    })
    if (signInError) { setError(signInError.message); setLoading(false); return }
    const role = data.user?.user_metadata?.role as UserRole | undefined
    router.push(redirectTo ?? (role ? ROLE_HOME[role] : '/'))
    router.refresh()
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
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

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]; newOtp[index] = value.slice(-1); setOtp(newOtp)
    if (value && index < 3) otpRefs[index + 1].current?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs[index - 1].current?.focus()
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpValue = otp.join('')
    if (otpValue.length !== 4) { setError('Enter the complete 4-digit OTP.'); return }
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
    setSuccess('Account created! Signing you in...')
    setLoading(false)
    setTimeout(() => goTo('student-login'), 2000)
  }

  // Shared input style
  const inp: React.CSSProperties = {
    width: '100%', padding: '0.8rem 1rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', color: '#f0f2f8',
    fontSize: '0.92rem', outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box' as const,
  }

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.68rem', color: '#5a647a',
    fontWeight: 600, marginBottom: '0.35rem',
    letterSpacing: '0.1em', textTransform: 'uppercase' as const,
  }

  const btn = (bg = '#6366f1', text = '#fff'): React.CSSProperties => ({
    width: '100%', background: bg, color: text, border: 'none',
    borderRadius: '10px', padding: '0.85rem',
    fontSize: '0.92rem', fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '-0.01em',
    transition: 'opacity 0.2s',
    boxShadow: bg === '#6366f1' ? '0 0 24px rgba(99,102,241,0.25)' : 'none',
  })

  return (
    <main style={{
      minHeight: '100vh', minHeight: '100dvh',
      background: '#080a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      padding: '1.5rem 1rem',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />
      {/* Accent glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '400px', height: '300px', pointerEvents: 'none',
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px',
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '14px', fontSize: '1.4rem', marginBottom: '1rem',
          }}>🍽</div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '1.75rem', fontWeight: 800,
            color: '#f0f2f8', margin: 0, letterSpacing: '-0.03em',
          }}>Mess Auth</h1>
          <p style={{ color: '#5a647a', marginTop: '0.3rem', fontSize: '0.82rem' }}>
            IIITDM Kurnool · Hostel Mess Portal
          </p>
        </div>

        {/* ── ROLE SELECT ── */}
        {mode === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fade-up 0.3s ease both' }}>
            <p style={{ textAlign: 'center', color: '#5a647a', fontSize: '0.8rem',
              marginBottom: '0.5rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Select your role
            </p>
            {[
              {
                mode: 'student-login' as Mode,
                label: 'Student',
                sub: 'Login or create an account',
                accent: '#6366f1',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                  </svg>
                ),
              },
              {
                mode: 'staff-login' as Mode,
                label: 'Staff / Admin',
                sub: 'Authorized personnel only',
                accent: '#a78bfa',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                ),
              },
            ].map(item => (
              <button key={item.mode} onClick={() => goTo(item.mode)} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px', padding: '1.25rem 1.25rem',
                cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '1rem',
                transition: 'border-color 0.2s, background 0.2s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${item.accent}44`
                  e.currentTarget.style.background = `${item.accent}08`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                }}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: `${item.accent}15`,
                  border: `1px solid ${item.accent}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: item.accent, flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ color: '#f0f2f8', fontWeight: 600, fontSize: '0.95rem',
                    fontFamily: "'Syne', sans-serif" }}>{item.label}</div>
                  <div style={{ color: '#5a647a', fontSize: '0.78rem', marginTop: '0.1rem' }}>
                    {item.sub}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', color: '#2a3248', fontSize: '1rem' }}>→</div>
              </button>
            ))}
          </div>
        )}

        {/* ── STUDENT LOGIN ── */}
        {mode === 'student-login' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px', padding: '1.75rem', animation: 'fade-up 0.25s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button onClick={() => goTo('select')} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#5a647a', cursor: 'pointer', fontSize: '0.9rem',
              }}>←</button>
              <h2 style={{ color: '#f0f2f8', fontWeight: 700, fontSize: '1rem', margin: 0,
                fontFamily: "'Syne', sans-serif" }}>Student Login</h2>
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
              {error && <ErrBox msg={error} />}
              <button type="submit" disabled={loading} style={btn()}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: '#5a647a' }}>
              No account?{' '}
              <button onClick={() => goTo('student-signup')} style={{
                background: 'none', border: 'none', color: '#818cf8',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: 0,
              }}>Create one</button>
            </p>
          </div>
        )}

        {/* ── STUDENT SIGNUP ── */}
        {mode === 'student-signup' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px', padding: '1.75rem', animation: 'fade-up 0.25s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button onClick={() => goTo('student-login')} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#5a647a', cursor: 'pointer', fontSize: '0.9rem',
              }}>←</button>
              <h2 style={{ color: '#f0f2f8', fontWeight: 700, fontSize: '1rem', margin: 0,
                fontFamily: "'Syne', sans-serif" }}>Create Account</h2>
            </div>
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
              {error && <ErrBox msg={error} />}
              <button type="submit" disabled={loading} style={btn()}>
                {loading ? 'Sending OTP…' : 'Send OTP to Email'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: '#5a647a' }}>
              Already have an account?{' '}
              <button onClick={() => goTo('student-login')} style={{
                background: 'none', border: 'none', color: '#818cf8',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: 0,
              }}>Sign In</button>
            </p>
          </div>
        )}

        {/* ── OTP VERIFY ── */}
        {mode === 'student-otp' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px', padding: '1.75rem', animation: 'fade-up 0.25s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button onClick={() => goTo('student-signup')} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#5a647a', cursor: 'pointer', fontSize: '0.9rem',
              }}>←</button>
              <h2 style={{ color: '#f0f2f8', fontWeight: 700, fontSize: '1rem', margin: 0,
                fontFamily: "'Syne', sans-serif" }}>Verify Email</h2>
            </div>

            <div style={{
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem',
            }}>
              <div style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                OTP sent to
              </div>
              <div style={{ fontSize: '0.88rem', color: '#f0f2f8', fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace" }}>{signupEmail}</div>
              <div style={{ fontSize: '0.72rem', color: '#5a647a', marginTop: '0.25rem' }}>
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
                        width: '62px', height: '62px', textAlign: 'center',
                        fontSize: '1.6rem', fontWeight: 700, color: '#f0f2f8',
                        background: digit ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${digit ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '12px', outline: 'none',
                        fontFamily: "'Syne', sans-serif",
                        transition: 'all 0.15s',
                        boxSizing: 'border-box',
                        caretColor: '#818cf8',
                      }}
                    />
                  ))}
                </div>
              </div>
              {error   && <ErrBox msg={error} />}
              {success && <OkBox msg={success} />}
              <button type="submit"
                disabled={loading || otp.join('').length !== 4}
                style={{
                  ...btn(),
                  opacity: (loading || otp.join('').length !== 4) ? 0.4 : 1,
                }}>
                {loading ? 'Verifying…' : 'Verify & Create Account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: '#5a647a' }}>
              {otpCooldown > 0 ? (
                <>Resend in <span style={{ color: '#818cf8', fontFamily: "'JetBrains Mono', monospace" }}>{otpCooldown}s</span></>
              ) : (
                <button onClick={handleResendOtp} style={{
                  background: 'none', border: 'none', color: '#818cf8',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: 0,
                }}>Resend OTP</button>
              )}
            </div>
          </div>
        )}

        {/* ── STAFF / ADMIN LOGIN ── */}
        {mode === 'staff-login' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px', padding: '1.75rem', animation: 'fade-up 0.25s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button onClick={() => goTo('select')} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#5a647a', cursor: 'pointer', fontSize: '0.9rem',
              }}>←</button>
              <h2 style={{ color: '#f0f2f8', fontWeight: 700, fontSize: '1rem', margin: 0,
                fontFamily: "'Syne', sans-serif" }}>Staff / Admin</h2>
            </div>
            <div style={{
              background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)',
              borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem',
              fontSize: '0.8rem', color: '#c4b5fd',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span>🔐</span> Authorized personnel only
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
              {error && <ErrBox msg={error} />}
              <button type="submit" disabled={loading}
                style={btn('rgba(167,139,250,0.15)', '#c4b5fd')}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        {mode !== 'select' && (
          <p style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button onClick={() => goTo('select')} style={{
              background: 'none', border: 'none', color: '#2a3248',
              cursor: 'pointer', fontSize: '0.78rem',
            }}>← Back to role selection</button>
          </p>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes fade-up { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder { color: #2a3248; }
        select option { background: #141824; color: #f0f2f8; }
        input:focus, select:focus { border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        * { box-sizing: border-box; }
      `}</style>
    </main>
  )
}

const ErrBox = ({ msg }: { msg: string }) => (
  <div style={{
    background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
    borderRadius: '8px', padding: '0.65rem 0.9rem',
    color: '#fca5a5', fontSize: '0.82rem', lineHeight: 1.4,
  }}>{msg}</div>
)

const OkBox = ({ msg }: { msg: string }) => (
  <div style={{
    background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
    borderRadius: '8px', padding: '0.65rem 0.9rem',
    color: '#6ee7b7', fontSize: '0.82rem', lineHeight: 1.4,
  }}>{msg}</div>
)

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080a0f' }} />}>
      <LoginContent />
    </Suspense>
  )
}