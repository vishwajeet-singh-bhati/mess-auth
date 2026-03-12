// app/(admin)/loading.tsx
export default function AdminLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      <div style={{ height: '56px', background: 'var(--surface)', borderRadius: 'var(--radius-md)',
        animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            height: '80px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
            animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite`,
          }} />
        ))}
      </div>
      {[100, 160].map((h, i) => (
        <div key={i} style={{
          height: `${h}px`, background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}
