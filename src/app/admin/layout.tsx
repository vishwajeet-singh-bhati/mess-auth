// app/(admin)/layout.tsx
import { redirect } from 'next/navigation'
import { getServerUserProfile } from '@/lib/supabase/server'
import { BottomNav } from '@/components/shared/BottomNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect(`/${profile.role}/dashboard`)

  return (
    <div className="page-shell">
      <main className="page-content">{children}</main>
      <BottomNav role="admin" />
    </div>
  )
}
