// app/(student)/loading.tsx
// Shown by Next.js while a student Server Component is loading.

export default function StudentLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      {/* TopBar skeleton */}
      <div style={{ height: '56px', background: 'var(--surface)', borderRadius: 'var(--radius-md)',
        animation: 'pulse 1.5s ease-in-out infinite' }} />
      {/* Card skeletons */}
      {[120, 80, 100].map((h, i) => (
        <div key={i} style={{
          height: `${h}px`, background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
    </div>
  )
}
