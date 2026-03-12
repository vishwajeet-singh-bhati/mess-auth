// app/page.tsx
// Root route — middleware handles the redirect,
// but this page handles the edge case where middleware doesn't run
// (e.g., direct server render).

import { redirect } from 'next/navigation'
import { getServerUserProfile } from '@/lib/supabase/server'

const ROLE_HOME: Record<string, string> = {
  student: '/student/dashboard',
  staff:   '/staff/dashboard',
  admin:   '/admin/dashboard',
}

export default async function RootPage() {
  const profile = await getServerUserProfile()

  if (!profile) {
    redirect('/login')
  }

  const home = ROLE_HOME[profile.role] ?? '/login'
  redirect(home)
}
