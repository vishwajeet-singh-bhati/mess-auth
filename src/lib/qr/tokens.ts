// lib/qr/tokens.ts
// Secure dynamic QR token generation and verification.
//
// Token format:  base64url(JSON payload) + "." + HMAC-SHA256 signature
//
// Security properties:
//   1. HMAC signature prevents forgery without server secret
//   2. `exp` field enforces 30-second TTL
//   3. `jti` UUID nonce prevents replay — stored in DB and checked on scan
//   4. Constant-time signature comparison prevents timing attacks
//   5. Token hash stored in DB for O(1) lookup without storing raw token

import { createHmac, createHash, randomUUID, timingSafeEqual } from 'crypto'
import type { QRTokenPayload } from '@/types/api'
import type { MessId } from '@/types/database'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALGORITHM = 'sha256'
const SEPARATOR = '.'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'QR_SIGNING_SECRET must be set and at least 32 characters long. ' +
      'Generate with: openssl rand -hex 32'
    )
  }
  return secret
}

function toBase64url(str: string): string {
  return Buffer.from(str).toString('base64url')
}

function fromBase64url(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8')
}

function sign(data: string): string {
  return createHmac(ALGORITHM, getSecret()).update(data).digest('base64url')
}

function constantTimeEqual(a: string, b: string): boolean {
  // Pad to same length to prevent length-based timing info
  const maxLen = Math.max(a.length, b.length)
  const bufA = Buffer.alloc(maxLen)
  const bufB = Buffer.alloc(maxLen)
  Buffer.from(a).copy(bufA)
  Buffer.from(b).copy(bufB)
  return timingSafeEqual(bufA, bufB)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GeneratedToken {
  /** The full signed token string to encode into QR */
  token: string
  /** The decoded payload */
  payload: QRTokenPayload
  /** SHA-256 hash of the token (stored in DB for replay detection) */
  tokenHash: string
  /** Expiry as a Date object */
  expiresAt: Date
}

/**
 * Generate a short-lived signed QR token for a specific mess entrance.
 *
 * @param messId      - Which mess this token is valid for
 * @param kioskSession - Identifier for the kiosk display session
 * @param ttlSeconds  - How long the token is valid (default: 30)
 */
export function generateToken(
  messId: MessId,
  kioskSession: string,
  ttlSeconds = 30
): GeneratedToken {
  const nowSec = Math.floor(Date.now() / 1000)

  const payload: QRTokenPayload = {
    jti: randomUUID(),           // unique nonce per token
    mess_id: messId,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
    kiosk_session: kioskSession,
  }

  const payloadB64 = toBase64url(JSON.stringify(payload))
  const signature  = sign(payloadB64)
  const token      = `${payloadB64}${SEPARATOR}${signature}`
  const tokenHash  = createHash('sha256').update(token).digest('hex')

  return {
    token,
    payload,
    tokenHash,
    expiresAt: new Date((nowSec + ttlSeconds) * 1000),
  }
}

// ─── Verification Errors ──────────────────────────────────────────────────────

export class QRTokenError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_FORMAT' | 'INVALID_SIGNATURE' | 'TOKEN_EXPIRED'
  ) {
    super(message)
    this.name = 'QRTokenError'
  }
}

/**
 * Verify a QR token string.
 * Throws QRTokenError with a specific code if invalid.
 * Does NOT check database replay status — caller must do that.
 *
 * @param token - Raw token string scanned from QR code
 * @returns Decoded and verified payload
 */
export function verifyToken(token: string): QRTokenPayload {
  // 1. Structural validation
  const parts = token.split(SEPARATOR)
  if (parts.length !== 2) {
    throw new QRTokenError('Token format invalid: expected payload.signature', 'INVALID_FORMAT')
  }

  const [payloadB64, providedSig] = parts

  // 2. Signature verification (constant-time)
  const expectedSig = sign(payloadB64)
  if (!constantTimeEqual(providedSig, expectedSig)) {
    throw new QRTokenError('Token signature invalid', 'INVALID_SIGNATURE')
  }

  // 3. Decode payload
  let payload: QRTokenPayload
  try {
    payload = JSON.parse(fromBase64url(payloadB64))
  } catch {
    throw new QRTokenError('Token payload could not be decoded', 'INVALID_FORMAT')
  }

  // 4. Field presence check
  if (!payload.jti || !payload.mess_id || !payload.iat || !payload.exp) {
    throw new QRTokenError('Token payload missing required fields', 'INVALID_FORMAT')
  }

  // 5. Expiry check
  const nowSec = Math.floor(Date.now() / 1000)
  if (payload.exp < nowSec) {
    throw new QRTokenError(
      `Token expired ${nowSec - payload.exp} seconds ago`,
      'TOKEN_EXPIRED'
    )
  }

  return payload
}

/**
 * Compute SHA-256 hash of a token for DB storage/lookup.
 * Consistent with hash stored at generation time.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Check if a token is expired without full verification.
 * Useful for quick client-side TTL display (not security-critical).
 */
export function isTokenExpiredUnsafe(token: string): boolean {
  try {
    const payloadB64 = token.split(SEPARATOR)[0]
    const payload = JSON.parse(fromBase64url(payloadB64)) as QRTokenPayload
    return payload.exp < Math.floor(Date.now() / 1000)
  } catch {
    return true
  }
}
