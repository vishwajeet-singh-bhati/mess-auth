// lib/supabase/server.ts
// Server-side Supabase client for:
//   - Route Handlers (app/api/*)
//   - Server Components
//   - Server Actions
// Reads/writes cookies to maintain session across requests.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client for server-side use.
 * Must be called inside a request context (Route Handler or Server Component).
 * Uses anon key — subject to RLS.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // Session refresh will happen on next client navigation.
          }
        },
      },
    }
  )
}

/**
 * Get the currently authenticated user from server context.
 * Returns null if not authenticated.
 */
export async function getServerUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

/**
 * Get the full user profile + role from public.users.
 * Returns null if not authenticated or user not found.
 */
export async function getServerUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_active, avatar_url')
    .eq('auth_id', user.id)
    .single()

  return profile
}
