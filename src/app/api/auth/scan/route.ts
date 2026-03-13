// app/api/auth/scan/route.ts
// ============================================================
// QR Scan Authorization Endpoint
// Called when a logged-in student scans a mess entrance QR.
//
// POST /api/auth/scan
// Body: { qr_token: "MESS_A" | "MESS_B" }
// Auth: Requires valid Supabase student session
//
// Returns:
//   200 → { success: true, data: MealAuthSuccessData }
//   403 → { success: false, reason: DenialReason, message: string }
//   401 → { error: "Authentication required" }
//   400 → { error: "Missing qr_token" }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { authorizeViaScan } from '@/lib/meal/authorization'
import { unauthorized, badRequest } from '@/lib/auth/permissions'
import { scanLimiter } from '@/lib/utils/rate-limit'
import type { ScanAuthRequest } from '@/types/api'

export async function POST(req: NextRequest) {
  // ── Authenticate student ──────────────────────────────────────────────────
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorized()
  }

  // ── Rate limiting (per user ID, not IP, since students share networks) ────
  const { success: rlOk, retryAfter } = scanLimiter.check(user.id)
  if (!rlOk) {
    return NextResponse.json(
      { success: false, reason: 'invalid_token', message: 'Too many scan attempts. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  // ── Parse request body ────────────────────────────────────────────────────
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

  // Static QR only contains "MESS_A" or "MESS_B" — max 10 chars
  if (qr_token.length > 10) {
    return badRequest('Invalid QR code')
  }

  // ── Extract client metadata for audit log ────────────────────────────────
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    undefined

  const userAgent = req.headers.get('user-agent') ?? undefined

  // ── Run authorization engine ──────────────────────────────────────────────
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