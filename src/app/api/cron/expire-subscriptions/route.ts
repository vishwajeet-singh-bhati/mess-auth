// app/api/cron/expire-subscriptions/route.ts
// Vercel Cron — runs daily at 00:00.
// Marks subscriptions whose end_date < today as 'expired'.
// Also generates a daily summary log.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel cron requests include this header with CRON_SECRET
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const start = Date.now()

  try {
    // Call the stored procedure
    const { error } = await db.rpc('fn_expire_subscriptions')
    if (error) throw error

    // Count what's now expired
    const { count: expiredCount } = await db
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired')
      .gte('updated_at', new Date(Date.now() - 60_000).toISOString())

    const elapsed = Date.now() - start
    console.log(`[cron/expire-subscriptions] Marked ${expiredCount ?? 0} expired in ${elapsed}ms`)

    return NextResponse.json({
      ok:      true,
      expired: expiredCount ?? 0,
      elapsed: `${elapsed}ms`,
      ran_at:  new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[cron/expire-subscriptions] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
