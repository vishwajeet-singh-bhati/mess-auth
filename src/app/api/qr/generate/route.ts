// app/api/qr/generate/route.ts
// ============================================================
// QR Token Generation Endpoint
// Called by kiosk display pages to get fresh signed tokens.
//
// GET /api/qr/generate?mess_id=mess_a&session=<kiosk-session-uuid>
//
// Security:
//   - This endpoint is intentionally PUBLIC (no auth required)
//     because kiosk TVs display the page without user login.
//   - The token itself is cryptographically signed and short-lived.
//   - Rate limiting should be applied at the CDN/proxy level.
//   - The endpoint registers each token in the DB so the
//     authorization endpoint can detect replays.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { generateToken } from '@/lib/qr/tokens'
import { createAdminClient } from '@/lib/supabase/admin'
import { qrGenerateLimiter } from '@/lib/utils/rate-limit'
import type { MessId } from '@/types/database'
import type { GenerateQRResponse } from '@/types/api'

const VALID_MESS_IDS: MessId[] = ['mess_a', 'mess_b']

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const messId = searchParams.get('mess_id') as MessId | null
  const kioskSession = searchParams.get('session') ?? 'default'

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { success: rlOk, retryAfter } = qrGenerateLimiter.check(ip)
  if (!rlOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Slow down QR refresh requests.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  // ── Validate mess_id ──────────────────────────────────────────────────────
  if (!messId || !VALID_MESS_IDS.includes(messId)) {
    return NextResponse.json(
      { error: 'Invalid or missing mess_id. Must be: mess_a | mess_b' },
      { status: 400 }
    )
  }

  const db = createAdminClient()

  // ── Fetch QR config for this mess ────────────────────────────────────────
  const { data: config, error: configError } = await db
    .from('qr_config')
    .select('token_ttl_secs, refresh_interval_secs, is_enabled')
    .eq('mess_id', messId)
    .single()

  if (configError || !config) {
    console.error('[qr/generate] Config fetch error:', configError)
    return NextResponse.json(
      { error: 'QR configuration not found for this mess' },
      { status: 500 }
    )
  }

  if (!config.is_enabled) {
    return NextResponse.json(
      { error: 'QR authorization is currently disabled for this mess' },
      { status: 503 }
    )
  }

  // ── Generate signed token ─────────────────────────────────────────────────
  const { token, payload, tokenHash, expiresAt } = generateToken(
    messId,
    kioskSession,
    config.token_ttl_secs
  )

  // ── Register token in DB (enables replay detection) ──────────────────────
  const { error: insertError } = await db.from('qr_sessions').insert({
    id:             payload.jti,     // jti == UUID primary key
    mess_id:        messId,
    token_hash:     tokenHash,
    kiosk_session:  kioskSession,
    issued_at:      new Date(payload.iat * 1000).toISOString(),
    expires_at:     expiresAt.toISOString(),
    is_used:        false,
  })

  if (insertError) {
    // UUID collision is astronomically unlikely but handle it
    console.error('[qr/generate] Session insert error:', insertError)
    return NextResponse.json(
      { error: 'Failed to register QR session' },
      { status: 500 }
    )
  }

  // ── Cleanup stale sessions (async — don't await) ──────────────────────────
  db.rpc('fn_cleanup_qr_sessions').then().catch(() => {
    // Cleanup failure is non-critical
  })

  const response: GenerateQRResponse = {
    token,
    mess_id: messId,
    expires_at: expiresAt.toISOString(),
    ttl_seconds: config.token_ttl_secs,
    refresh_interval_secs: config.refresh_interval_secs,
  }

  // ── Response headers ──────────────────────────────────────────────────────
  return NextResponse.json(response, {
    headers: {
      // Don't cache QR tokens — always fresh
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
}
