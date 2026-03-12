// app/api/auth/manual/route.ts
// ============================================================
// Staff Manual Verification Endpoint
// Fallback when student cannot scan QR (phone battery, network, etc.)
//
// POST /api/auth/manual
// Body: { roll_number: string }
// Auth: Requires valid Supabase staff session
//
// All manual authorizations are:
//   1. Logged to authorization_attempts (method = 'manual_staff')
//   2. Logged to audit_logs for admin review
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { authorizeViaManual } from '@/lib/meal/authorization'
import {
  requireStaff,
  unauthorized,
  badRequest,
  forbidden,
} from '@/lib/auth/permissions'
import type { ManualAuthRequest } from '@/types/api'

// Basic roll number format validation (customize for your institute)
const ROLL_NUMBER_PATTERN = /^[A-Z]{2}\d{2}[A-Z]\d{3}$/

export async function POST(req: NextRequest) {
  // ── Authenticate session ──────────────────────────────────────────────────
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorized()
  }

  // ── Assert staff role and get assigned mess ───────────────────────────────
  let staffProfile
  try {
    staffProfile = await requireStaff(user.id)
  } catch (res) {
    if (res instanceof Response) return res
    return forbidden()
  }

  // ── Parse and validate request body ──────────────────────────────────────
  let body: ManualAuthRequest
  try {
    body = await req.json()
  } catch {
    return badRequest('Request body must be valid JSON')
  }

  const rollNumber = body.roll_number?.trim()?.toUpperCase()

  if (!rollNumber) {
    return badRequest('Missing roll_number field')
  }

  if (rollNumber.length > 20) {
    return badRequest('roll_number exceeds maximum length of 20 characters')
  }

  // Soft validation — don't hard-reject non-matching format
  // (allows admin to override with any roll number format)
  if (!ROLL_NUMBER_PATTERN.test(rollNumber)) {
    console.warn(`[auth/manual] Non-standard roll number format: ${rollNumber}`)
  }

  // ── Extract IP for audit ──────────────────────────────────────────────────
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    undefined

  // ── Run authorization ─────────────────────────────────────────────────────
  const result = await authorizeViaManual(
    rollNumber,
    staffProfile.userId,
    staffProfile.assignedMessId,
    ipAddress
  )

  return NextResponse.json(result, {
    status: result.success ? 200 : 403,
    headers: { 'Cache-Control': 'no-store' },
  })
}
