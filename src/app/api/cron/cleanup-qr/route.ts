// app/api/cron/cleanup-qr/route.ts
// Vercel Cron — runs every 15 minutes.
// Deletes used + expired QR sessions to keep the table lean.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const start = Date.now()

  try {
    const { error } = await db.rpc('fn_cleanup_qr_sessions')
    if (error) throw error

    const elapsed = Date.now() - start
    return NextResponse.json({
      ok:      true,
      elapsed: `${elapsed}ms`,
      ran_at:  new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[cron/cleanup-qr] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
