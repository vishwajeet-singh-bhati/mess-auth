// lib/supabase/admin.ts
// Service-role Supabase client — BYPASSES all RLS policies.
// ⚠️  NEVER import this in client components or expose to browser.
// ⚠️  Only use in:
//     - Route Handlers (app/api/*)
//     - Server Actions with explicit auth checks
//     - Background jobs / cron functions

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

let adminClient: ReturnType<typeof createClient<Database>> | null = null

/**
 * Returns a singleton Supabase admin client (service role).
 * Bypasses RLS — use only after performing your own authorization checks.
 */
export function createAdminClient() {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    )
  }

  adminClient = createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}
