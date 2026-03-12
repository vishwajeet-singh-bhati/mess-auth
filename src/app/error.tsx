'use client'
// app/error.tsx
// Global error boundary for Next.js App Router.
// Catches errors thrown in Server Components and shows recovery UI.

import { useEffect } from 'react'

interface ErrorPageProps {
  error:  Error & { digest?: string }
  reset:  () => void
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html>
      <body style={{
        margin: 0, padding: 0,
        background: '#070d1a',
        fontFamily: "'Outfit', system-ui, sans-serif",
        color: '#f1f5f9',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{ fontSize: '2.5rem' }}>⚠️</div>

          <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
            Something went wrong
          </div>

          <div style={{
            fontSize: '0.85rem',
            color: '#475569',
            lineHeight: 1.6,
            maxWidth: '280px',
          }}>
            {error.message && !error.message.includes('NEXT_') ? error.message :
              'An unexpected error occurred. Please try again.'}
          </div>

          {error.digest && (
            <div style={{
              fontFamily: 'monospace',
              fontSize: '0.68rem',
              color: '#1e2d45',
              background: '#0d1526',
              padding: '0.3rem 0.7rem',
              borderRadius: '0.375rem',
              border: '1px solid #1e2d45',
            }}>
              Error ID: {error.digest}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
            <button
              onClick={reset}
              style={{
                background: '#2563eb', color: 'white', border: 'none',
                borderRadius: '0.6rem', padding: '0.7rem 1.4rem',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                background: '#111827', color: '#94a3b8',
                border: '1px solid #1e2d45',
                borderRadius: '0.6rem', padding: '0.7rem 1.4rem',
                fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
