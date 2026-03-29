// app/api/auth/scan/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeViaScan } from '@/lib/meal/authorization'
import { unauthorized, badRequest } from '@/lib/auth/permissions'
import { scanLimiter } from '@/lib/utils/rate-limit'
import type { ScanAuthRequest } from '@/types/api'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorized()
  }

  // ── DEBUG: check what the admin client sees for this user ─────────────────
  const db = createAdminClient()
  const { data: debugUser, error: debugError } = await db
    .from('users')
    .select('id, email, is_active, auth_id')
    .eq('auth_id', user.id)
    .single()

  console.log('[SCAN DEBUG] auth user id:', user.id)
  console.log('[SCAN DEBUG] db lookup result:', JSON.stringify(debugUser))
  console.log('[SCAN DEBUG] db lookup error:', JSON.stringify(debugError))
  // ─────────────────────────────────────────────────────────────────────────

  const { success: rlOk, retryAfter } = scanLimiter.check(user.id)
  if (!rlOk) {
    return NextResponse.json(
      { success: false, reason: 'invalid_token', message: 'Too many scan attempts. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  let body: ScanAuthRequest
  try {
    body = await req.json()
  } catch {
    return badRequest('Request body must be valid JSON')
  }

  const { qr_token } = body

  if (!qr_token || typeof qr_token !== 'string') {
    return badRequest('Missing or invalid qr_token field')
  }

  if (qr_token.length > 10) {
    return badRequest('Invalid QR code')
  }

  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    undefined

  const userAgent = req.headers.get('user-agent') ?? undefined

  const result = await authorizeViaScan(
    qr_token,
    user.id,
    ipAddress,
    userAgent
  )

  return NextResponse.json(result, {
    status: result.success ? 200 : 403,
    headers: { 'Cache-Control': 'no-store' },
  })
}