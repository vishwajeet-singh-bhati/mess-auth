// app/api/meals/slots/route.ts
// Returns active meal slots for a given mess.
// Also computes which slot is currently active.
//
// GET /api/meals/slots?mess_id=mess_a

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentMealSlot, getNextMealSlot } from '@/lib/meal/slots'
import type { MessId } from '@/types/database'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const messId = searchParams.get('mess_id') as MessId | null

  const db = createAdminClient()

  let query = db
    .from('meal_slots')
    .select('id, mess_id, meal_type, start_time, end_time, is_active')
    .eq('is_active', true)
    .order('start_time', { ascending: true })

  if (messId) query = query.eq('mess_id', messId)

  const { data: slots, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = new Date()
  const activeSlot = slots ? getCurrentMealSlot(slots, now) : null
  const nextSlot   = slots ? getNextMealSlot(slots, now) : null

  return NextResponse.json({
    slots,
    active_slot: activeSlot,
    next_slot:   nextSlot,
    server_time: now.toISOString(),
  }, {
    headers: {
      // Cache for 30 seconds — slots don't change often
      'Cache-Control': 'public, max-age=30',
    },
  })
}
