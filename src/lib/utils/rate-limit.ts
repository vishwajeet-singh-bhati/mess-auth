// lib/utils/rate-limit.ts
// Simple in-process rate limiter using a sliding window.
// For production with multiple Vercel instances, swap the store
// for Upstash Redis (see comment at bottom).
//
// Usage in a Route Handler:
//
//   const limiter = rateLimit({ windowMs: 60_000, max: 20 })
//
//   export async function POST(req: NextRequest) {
//     const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
//     const { success, retryAfter } = limiter.check(ip)
//     if (!success) {
//       return NextResponse.json(
//         { error: 'Too many requests' },
//         { status: 429, headers: { 'Retry-After': String(retryAfter) } }
//       )
//     }
//     // ... rest of handler
//   }

interface RateLimitOptions {
  /** Rolling window in milliseconds */
  windowMs: number
  /** Max requests per window */
  max: number
  /** Optional key prefix for namespacing */
  prefix?: string
}

interface RateLimitResult {
  success: boolean
  remaining: number
  /** Seconds until window resets (only set when success=false) */
  retryAfter?: number
  limit: number
}

interface WindowEntry {
  count:     number
  resetTime: number
}

// Global store — survives across requests in the same Node.js process.
// Cleared on serverless cold starts (acceptable for QR/auth rate limiting).
const store = new Map<string, WindowEntry>()

// Periodic cleanup to prevent memory growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetTime < now) store.delete(key)
    }
  }, 60_000)
}

export function rateLimit(opts: RateLimitOptions) {
  const { windowMs, max, prefix = '' } = opts

  return {
    check(identifier: string): RateLimitResult {
      const key     = prefix ? `${prefix}:${identifier}` : identifier
      const now     = Date.now()
      const entry   = store.get(key)

      // New window
      if (!entry || entry.resetTime < now) {
        store.set(key, { count: 1, resetTime: now + windowMs })
        return { success: true, remaining: max - 1, limit: max }
      }

      // Within window
      if (entry.count >= max) {
        return {
          success:    false,
          remaining:  0,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
          limit:      max,
        }
      }

      entry.count++
      return { success: true, remaining: max - entry.count, limit: max }
    },

    reset(identifier: string): void {
      store.delete(prefix ? `${prefix}:${identifier}` : identifier)
    },
  }
}

// ─── Pre-configured limiters for each endpoint ───────────────────────────────

/** QR token generation — kiosk fetches every 25s, allow burst for multiple kiosks */
export const qrGenerateLimiter = rateLimit({
  windowMs: 60_000,    // 1 minute
  max:      20,        // 20 tokens/minute per IP (supports ~8 kiosks refreshing every 25s)
  prefix:   'qr-gen',
})

/** QR scan authorization — students scan at most once per meal slot */
export const scanLimiter = rateLimit({
  windowMs: 60_000,    // 1 minute
  max:      10,        // 10 scans/minute per IP (generous for retry + processing)
  prefix:   'scan',
})

/** Staff manual verification — throttle to prevent abuse */
export const manualLimiter = rateLimit({
  windowMs: 60_000,    // 1 minute
  max:      30,        // 30 lookups/minute per IP
  prefix:   'manual',
})

/** Login — protect against brute force */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,   // 15 minutes
  max:      10,             // 10 attempts per 15 minutes
  prefix:   'login',
})

// ─── Upstash Redis version (for multi-instance production) ────────────────────
//
// Install: npm install @upstash/redis @upstash/ratelimit
//
// import { Redis } from '@upstash/redis'
// import { Ratelimit } from '@upstash/ratelimit'
//
// const redis = new Redis({
//   url:   process.env.UPSTASH_REDIS_REST_URL!,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
// })
//
// export const scanLimiter = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(10, '1 m'),
//   prefix:  'scan',
// })
//
// Usage:
//   const { success, reset } = await scanLimiter.limit(ip)
