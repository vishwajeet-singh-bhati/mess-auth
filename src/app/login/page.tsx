'use client'
// app/(auth)/login/page.tsx

import { useState, useEffect, Suspense } from 'react' // Added Suspense here
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database'

// This line tells Next.js to skip static generation for this page
export const dynamic = 'force-dynamic' 

const ROLE_HOME: Record<UserRole, string> = {
  student: '/student/dashboard',
  staff:   '/staff/dashboard',
  admin:   '/admin/dashboard',
}

function LoginContent() { // We moved the main logic into a sub-component
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const role = user.user_metadata?.role as UserRole | undefined
        router.replace(redirectTo ?? (role ? ROLE_HOME[role] : '/'))
      }
    })
  }, [router, redirectTo, supabase.auth])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const role = data.user?.user_metadata?.role as UserRole | undefined
    const destination = redirectTo ?? (role ? ROLE_HOME[role] : '/')

    router.push(destination)
    router.refresh()
  }

  return (
    <main
      style={{
        minHeight:      '100vh',
        background:     '#070d1a',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontFamily:     "'Outfit', system-ui, sans-serif",
        padding:        '1rem',
      }}
    >
      {/* Background glow */}
      <div
        aria-hidden
        style={{
          position:      'fixed',
          top:           '30%',
          left:          '50%',
          transform:     'translateX(-50%)',
          width:         '500px',
          height:        '400px',
          background:    'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width:         '100%',
          maxWidth:      '400px',
          position:      'relative',
          zIndex:        1,
        }}
      >
        {/* Logo / title */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              display:         'inline-flex',
              alignItems:      'center',
              justifyContent:  'center',
              width:           '64px',
              height:          '64px',
              background:      'rgba(59,130,246,0.12)',
              border:          '1px solid rgba(59,130,246,0.3)',
              borderRadius:    '1rem',
              fontSize:        '1.75rem',
              marginBottom:    '1rem',
            }}
          >
            🍽
          </div>
          <h1
            style={{
              fontSize:       '1.75rem',
              fontWeight:     800,
              color:          '#f8fafc',
              margin:         0,
              letterSpacing: '-0.03em',
            }}
          >
            Mess Auth System
          </h1>
          <p style={{ color: '#475569', marginTop: '0.4rem', fontSize: '0.9rem' }}>
            Hostel Mess Management Portal
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            background:   '#0f1624',
            border:       '1px solid #1e2d45',
            borderRadius: '1.25rem',
            padding:      '2rem',
          }}
        >
          <h2
            style={{
              fontSize:    '1.1rem',
              fontWeight:  700,
              color:       '#e2e8f0',
              margin:      '0 0 1.5rem',
            }}
          >
            Sign in to your account
          </h2>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b',
                fontWeight: 600, marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@student.in"
                style={{
                  width:         '100%',
                  background:    '#070d1a',
                  border:        '1px solid #1e2d45',
                  borderRadius: '0.6rem',
                  padding:       '0.75rem 1rem',
                  color:         '#f1f5f9',
                  fontSize:      '0.95rem',
                  outline:       'none',
                  boxSizing:     'border-box',
                  transition:    'border-color 0.2s',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b',
                fontWeight: 600, marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width:         '100%',
                  background:    '#070d1a',
                  border:        '1px solid #1e2d45',
                  borderRadius: '0.6rem',
                  padding:       '0.75rem 1rem',
                  color:         '#f1f5f9',
                  fontSize:      '0.95rem',
                  outline:       'none',
                  boxSizing:     'border-box',
                  transition:    'border-color 0.2s',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  background:   'rgba(239,68,68,0.1)',
                  border:       '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '0.5rem',
                  padding:      '0.7rem 1rem',
                  color:        '#fca5a5',
                  fontSize:     '0.85rem',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background:    loading ? '#1e40af' : '#2563eb',
                color:          'white',
                border:        'none',
                borderRadius:  '0.6rem',
                padding:       '0.85rem',
                fontSize:      '0.95rem',
                fontWeight:    700,
                cursor:        loading ? 'not-allowed' : 'pointer',
                marginTop:     '0.25rem',
                transition:    'background 0.2s',
                opacity:       loading ? 0.8 : 1,
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div
          style={{
            marginTop:    '1.5rem',
            background:   'rgba(59,130,246,0.06)',
            border:       '1px solid rgba(59,130,246,0.15)',
            borderRadius: '0.8rem',
            padding:      '1rem 1.2rem',
            fontSize:     '0.78rem',
            color:        '#475569',
          }}
        >
          <div style={{ fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>
            Demo Credentials
          </div>
          {[
            ['Admin',     'admin@messsystem.in'],
            ['Staff A',   'staff.a@messsystem.in'],
            ['Student',   'cs21b001@student.in'],
          ].map(([role, email]) => (
            <div
              key={role}
              style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}
            >
              <span style={{ color: '#374151' }}>{role}</span>
              <button
                type="button"
                onClick={() => { setEmail(email); setPassword('MessAuth@2024') }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#3b82f6', fontSize: '0.78rem', fontFamily: 'monospace',
                  padding: 0,
                }}
              >
                {email}
              </button>
            </div>
          ))}
          <div style={{ marginTop: '0.4rem', color: '#374151' }}>
            Password: <code style={{ color: '#60a5fa' }}>MessAuth@2024</code>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
      `}</style>
    </main>
  )
}

// Final Export wrapped in Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}