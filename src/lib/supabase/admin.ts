// lib/supabase/admin.ts
// Service-role Supabase client — BYPASSES all RLS policies.
// ⚠️  NEVER import this in client components or expose to browser.
// ⚠️  Only use in:
//     - Route Handlers (app/api/*)
//     - Server Actions with explicit auth checks
//     - Background jobs / cron functions

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Returns a Supabase admin client (service role).
 * Bypasses RLS — use only after performing your own authorization checks.
 * Creates a fresh client each time to avoid stale state on Vercel serverless.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    )
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}