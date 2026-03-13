// app/api/subscriptions/select/route.ts
// POST — student selects their mess for the first time.
// Creates an active subscription from today to end of academic year.
// Only allowed if student has no active subscription.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unauthorized, badRequest } from '@/lib/auth/permissions'
import { dateToDateString } from '@/lib/meal/slots'
import type { MessId } from '@/types/database'

const VALID_MESS_IDS: MessId[] = ['mess_a', 'mess_b']

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized()

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { mess_id: MessId }
  try { body = await req.json() }
  catch { return badRequest('Invalid JSON') }

  const { mess_id } = body
  if (!mess_id || !VALID_MESS_IDS.includes(mess_id)) {
    return badRequest('mess_id must be "mess_a" or "mess_b"')
  }

  const db = createAdminClient()

  // ── Get profile and student ───────────────────────────────────────────────
  const { data: profile } = await db
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!profile) return unauthorized()
  if (profile.role !== 'student') {
    return NextResponse.json({ error: 'Only students can select a mess' }, { status: 403 })
  }

  const { data: student } = await db
    .from('students')
    .select('id, is_blocked')
    .eq('user_id', profile.id)
    .single()

  if (!student) {
    return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
  }

  if (student.is_blocked) {
    return NextResponse.json({ error: 'Your account is blocked. Contact the hostel office.' }, { status: 403 })
  }

  // ── Check no existing active subscription ─────────────────────────────────
  const today = dateToDateString(new Date())

  const { data: existing } = await db
    .from('subscriptions')
    .select('id, mess_id')
    .eq('student_id', student.id)
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: `You are already subscribed to ${existing.mess_id === 'mess_a' ? 'Mess A' : 'Mess B'}` },
      { status: 409 }
    )
  }

  // ── Create subscription (valid till Dec 31 of current year) ──────────────
  const endDate = `${new Date().getFullYear()}-12-31`

  const { data: sub, error: insertError } = await db
    .from('subscriptions')
    .insert({
      student_id: student.id,
      mess_id:    mess_id,
      status:     'active',
      start_date: today,
      end_date:   endDate,
      plan_name:  'Annual Plan',
      created_by: profile.id,
    })
    .select('id, mess_id, start_date, end_date')
    .single()

  if (insertError) {
    console.error('Subscription insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: sub }, { status: 201 })
}
