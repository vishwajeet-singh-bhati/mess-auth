// app/(staff)/layout.tsx
import { redirect } from 'next/navigation'
import { getServerUserProfile } from '@/lib/supabase/server'
import { BottomNav } from '@/components/shared/BottomNav'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const profile = await getServerUserProfile()
  if (!profile) redirect('/login')
  if (!['staff', 'admin'].includes(profile.role)) redirect('/student/dashboard')

  return (
    <div className="page-shell">
      <main className="page-content">{children}</main>
      <BottomNav role="staff" />
    </div>
  )
}
