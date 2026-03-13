'use client'
// app/login/page.tsx
// Signup calls /api/auth/signup so backend creates users+students rows properly

import { useState, useEffect, Suspense } from 'react'
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

type Mode = 'select' | 'student-login' | 'student-signup' | 'staff-login'

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
  }

  const goTo = (m: Mode) => { reset(); setMode(m) }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)

    if (!email.endsWith('@iiitk.ac.in')) {
      setError('Only @iiitk.ac.in email addresses are allowed.')
      setLoading(false); return
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false); return
    }

    const role = data.user?.user_metadata?.role as UserRole | undefined
    router.push(redirectTo ?? (role ? ROLE_HOME[role] : '/'))
    router.refresh()
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)

    if (!signupEmail.endsWith('@iiitk.ac.in')) {
      setError('Only @iiitk.ac.in email addresses are allowed.')
      setLoading(false); return
    }
    if (signupPass !== confirmPass) {
      setError('Passwords do not match.')
      setLoading(false); return
    }
    if (signupPass.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false); return
    }
    if (!hostel) { setError('Please select your hostel.'); setLoading(false); return }
    if (hostel !== 'SRK' && !wing) { setError('Please select your wing.'); setLoading(false); return }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: signupEmail.trim().toLowerCase(),
        password: signupPass,
        full_name: fullName.trim(),
        roll_number: rollNumber.trim(),
        hostel,
        wing: hostel === 'SRK' ? undefined : wing,
        room_number: roomNumber.trim(),
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      setLoading(false); return
    }

    setSuccess('Account created! You can now sign in.')
    setLoading(false)
    setTimeout(() => goTo('student-login'), 2000)
  }

  const S = {
    input: {
      width: '100%', background: '#070d1a', border: '1px solid #1e2d45',
      borderRadius: '0.6rem', padding: '0.75rem 1rem', color: '#f1f5f9',
      fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box',
    } as React.CSSProperties,
    label: {
      display: 'block', fontSize: '0.75rem', color: '#64748b',
      fontWeight: 600, marginBottom: '0.35rem', letterSpacing: '0.05em',
    } as React.CSSProperties,
    btn: (bg = '#2563eb') => ({
      width: '100%', background: bg, color: 'white', border: 'none',
      borderRadius: '0.6rem', padding: '0.85rem', fontSize: '0.95rem',
      fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.75 : 1, marginTop: '0.25rem',
    } as React.CSSProperties),
    card: {
      background: '#0f1624', border: '1px solid #1e2d45',
      borderRadius: '1.25rem', padding: '1.75rem',
    } as React.CSSProperties,
    back: {
      background: 'none', border: 'none', color: '#475569',
      cursor: 'pointer', fontSize: '1.1rem', padding: 0,
    } as React.CSSProperties,
  }

  const BackHeader = ({ title, to }: { title: string; to: Mode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
      <button onClick={() => goTo(to)} style={S.back}>←</button>
      <h2 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>{title}</h2>
    </div>
  )

  return (
    <main style={{
      minHeight: '100vh', background: '#070d1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', system-ui, sans-serif", padding: '1.5rem 1rem',
    }}>
      <div aria-hidden style={{
        position: 'fixed', top: '25%', left: '50%', transform: 'translateX(-50%)',
        width: '500px', height: '400px', pointerEvents: 'none',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.1) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '60px', height: '60px', background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.3)', borderRadius: '1rem',
            fontSize: '1.6rem', marginBottom: '0.85rem',
          }}>🍽</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.03em' }}>
            Mess Auth
          </h1>
          <p style={{ color: '#475569', marginTop: '0.3rem', fontSize: '0.85rem' }}>
            IIITDM Kurnool — Hostel Mess Portal
          </p>
        </div>

        {/* ROLE SELECT */}
        {mode === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Who are you?
            </p>
            {[
              { mode: 'student-login' as Mode, icon: '🎓', title: 'Student', sub: 'Login or create a new account', hover: '#3b82f6' },
              { mode: 'staff-login'   as Mode, icon: '🔐', title: 'Staff / Admin', sub: 'Authorized personnel only', hover: '#8b5cf6' },
            ].map(item => (
              <button key={item.mode} onClick={() => goTo(item.mode)} style={{
                background: '#0f1624', border: '1px solid #1e2d45', borderRadius: '1rem',
                padding: '1.5rem', cursor: 'pointer', textAlign: 'left',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = item.hover)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e2d45')}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem' }}>{item.title}</div>
                <div style={{ color: '#475569', fontSize: '0.82rem', marginTop: '0.2rem' }}>{item.sub}</div>
              </button>
            ))}
          </div>
        )}

        {/* STUDENT LOGIN */}
        {mode === 'student-login' && (
          <div style={S.card}>
            <BackHeader title="Student Login" to="select" />
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={S.label}>INSTITUTE EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="yourname@iiitk.ac.in" style={S.input} />
              </div>
              <div>
                <label style={S.label}>PASSWORD</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••" style={S.input} />
              </div>
              {error && <Err msg={error} />}
              <button type="submit" disabled={loading} style={S.btn()}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <span style={{ color: '#475569', fontSize: '0.85rem' }}>No account? </span>
              <button onClick={() => goTo('student-signup')} style={{
                background: 'none', border: 'none', color: '#3b82f6',
                fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, padding: 0,
              }}>Create one</button>
            </div>
          </div>
        )}

        {/* STUDENT SIGNUP */}
        {mode === 'student-signup' && (
          <div style={S.card}>
            <BackHeader title="Create Student Account" to="student-login" />
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={S.label}>FULL NAME</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  required placeholder="Your full name" style={S.input} />
              </div>
              <div>
                <label style={S.label}>ROLL NUMBER</label>
                <input type="text" value={rollNumber} onChange={e => setRollNumber(e.target.value)}
                  required placeholder="e.g. CS23B001" style={S.input} />
              </div>
              <div>
                <label style={S.label}>INSTITUTE EMAIL</label>
                <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                  required placeholder="yourname@iiitk.ac.in" style={S.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: hostel === 'SRK' ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={S.label}>HOSTEL</label>
                  <select value={hostel} onChange={e => { setHostel(e.target.value); setWing('') }}
                    required style={{ ...S.input, appearance: 'none' } as React.CSSProperties}>
                    <option value="">Select hostel</option>
                    {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                {hostel && hostel !== 'SRK' && (
                  <div>
                    <label style={S.label}>WING</label>
                    <select value={wing} onChange={e => setWing(e.target.value)}
                      required style={{ ...S.input, appearance: 'none' } as React.CSSProperties}>
                      <option value="">Select wing</option>
                      {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label style={S.label}>ROOM NUMBER</label>
                <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)}
                  required placeholder="e.g. 204" style={S.input} />
              </div>
              <div>
                <label style={S.label}>PASSWORD</label>
                <input type="password" value={signupPass} onChange={e => setSignupPass(e.target.value)}
                  required placeholder="Min. 8 characters" style={S.input} />
              </div>
              <div>
                <label style={S.label}>CONFIRM PASSWORD</label>
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                  required placeholder="Re-enter password" style={S.input} />
              </div>
              {error   && <Err msg={error} />}
              {success && <Ok  msg={success} />}
              <button type="submit" disabled={loading} style={S.btn()}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <span style={{ color: '#475569', fontSize: '0.85rem' }}>Already have an account? </span>
              <button onClick={() => goTo('student-login')} style={{
                background: 'none', border: 'none', color: '#3b82f6',
                fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, padding: 0,
              }}>Sign In</button>
            </div>
          </div>
        )}

        {/* STAFF / ADMIN LOGIN */}
        {mode === 'staff-login' && (
          <div style={S.card}>
            <BackHeader title="Staff / Admin Login" to="select" />
            <div style={{
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '0.6rem', padding: '0.7rem 1rem', marginBottom: '1.25rem',
              fontSize: '0.82rem', color: '#a78bfa',
            }}>
              🔐 This portal is for authorized personnel only.
            </div>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={S.label}>INSTITUTE EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="yourname@iiitk.ac.in" style={S.input} />
              </div>
              <div>
                <label style={S.label}>PASSWORD</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••" style={S.input} />
              </div>
              {error && <Err msg={error} />}
              <button type="submit" disabled={loading} style={S.btn('#7c3aed')}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        {mode !== 'select' && (
          <p style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button onClick={() => goTo('select')} style={{
              background: 'none', border: 'none', color: '#334155',
              cursor: 'pointer', fontSize: '0.8rem',
            }}>← Back to role selection</button>
          </p>
        )}

      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        input::placeholder { color: #334155; }
        select option { background: #0f1624; color: #f1f5f9; }
      `}</style>
    </main>
  )
}

const Err = ({ msg }: { msg: string }) => (
  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '0.5rem', padding: '0.7rem 1rem', color: '#fca5a5', fontSize: '0.85rem' }}>
    {msg}
  </div>
)

const Ok = ({ msg }: { msg: string }) => (
  <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: '0.5rem', padding: '0.7rem 1rem', color: '#86efac', fontSize: '0.85rem' }}>
    {msg}
  </div>
)

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#070d1a' }} />}>
      <LoginContent />
    </Suspense>
  )
}