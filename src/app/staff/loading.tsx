// app/(staff)/loading.tsx
export default function StaffLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      <div style={{ height: '56px', background: 'var(--surface)', borderRadius: 'var(--radius-md)',
        animation: 'pulse 1.5s ease-in-out infinite' }} />
      {[80, 60, 140].map((h, i) => (
        <div key={i} style={{
          height: `${h}px`, background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
    </div>
  )
}
