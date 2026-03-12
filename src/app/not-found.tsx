// app/not-found.tsx
import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', fontFamily: "'Outfit', system-ui, sans-serif",
      color: 'var(--text)', textAlign: 'center', padding: '2rem', gap: '1rem',
    }}>
      <div style={{ fontSize: '2.5rem' }}>🍽️</div>
      <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--accent)',
        letterSpacing: '-0.04em', lineHeight: 1 }}>404</div>
      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Page not found</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '260px', lineHeight: 1.5 }}>
        This page doesn't exist or you don't have permission to view it.
      </div>
      <Link href="/" style={{
        marginTop: '0.5rem',
        background: 'var(--accent)', color: 'white', textDecoration: 'none',
        borderRadius: 'var(--radius-md)', padding: '0.7rem 1.5rem',
        fontWeight: 700, fontSize: '0.9rem',
      }}>
        Go to Dashboard
      </Link>
    </div>
  )
}
