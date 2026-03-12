// app/api/health/route.ts
// Lightweight health check for uptime monitors (UptimeRobot, Vercel, etc.)
// Returns 200 if DB is reachable, 503 if not.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()

  try {
    const db = createAdminClient()

    // Lightweight ping: count messes (always returns 2)
    const { count, error } = await db
      .from('messes')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    const elapsed = Date.now() - start

    return NextResponse.json({
      status:    'ok',
      db:        'connected',
      messes:    count,
      latency_ms: elapsed,
      timestamp: new Date().toISOString(),
      version:   process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        status:    'error',
        db:        'unreachable',
        message:   err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
