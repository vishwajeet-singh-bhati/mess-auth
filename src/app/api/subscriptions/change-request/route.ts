// app/api/subscriptions/change-request/route.ts
// POST — student submits a mess change request.
// GET  — admin fetches all requests (with filters).
// Admin approves/rejects via PATCH on this same route.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unauthorized, forbidden, badRequest } from '@/lib/auth/permissions'
import { dateToDateString } from '@/lib/meal/slots'
import type { MessId } from '@/types/database'

// ── POST: student submits request ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized()

  let body: { reason?: string }
  try { body = await req.json() }
  catch { return badRequest('Invalid JSON') }

  const { reason } = body
  if (!reason || reason.trim().length < 10) {
    return badRequest('Please provide a reason of at least 10 characters')
  }
  if (reason.trim().length > 500) {
    return badRequest('Reason must be under 500 characters')
  }

  const db = createAdminClient()

  const { data: profile } = await db
    .from('users').select('id, role').eq('auth_id', user.id).single()

  if (!profile) return unauthorized()
  if (profile.role !== 'student') return forbidden()

  const { data: student } = await db
    .from('students').select('id, is_blocked').eq('user_id', profile.id).single()

  if (!student) return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
  if (student.is_blocked) return NextResponse.json(
    { error: 'Your account is blocked. Contact the hostel office.' }, { status: 403 }
  )

  const today = dateToDateString(new Date())

  // Must have an active subscription
  const { data: currentSub } = await db
    .from('subscriptions')
    .select('id, mess_id')
    .eq('student_id', student.id)
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
    .maybeSingle()

  if (!currentSub) {
    return NextResponse.json(
      { error: 'You need an active subscription to request a mess change' }, { status: 400 }
    )
  }

  // No pending request already
  const { data: existing } = await db
    .from('mess_change_requests')
    .select('id')
    .eq('student_id', student.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'You already have a pending change request' }, { status: 409 }
    )
  }

  const toMessId: MessId = currentSub.mess_id === 'mess_a' ? 'mess_b' : 'mess_a'

  const { data: request, error: insertError } = await db
    .from('mess_change_requests')
    .insert({
      student_id:   student.id,
      from_mess_id: currentSub.mess_id,
      to_mess_id:   toMessId,
      reason:       reason.trim(),
    })
    .select('id, from_mess_id, to_mess_id, status, requested_at')
    .single()

  if (insertError) {
    console.error('Change request insert error:', insertError)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: request }, { status: 201 })
}

// ── PATCH: admin approves or rejects ─────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized()

  let body: { request_id: string; action: 'approve' | 'reject'; review_note?: string }
  try { body = await req.json() }
  catch { return badRequest('Invalid JSON') }

  const { request_id, action, review_note } = body

  if (!request_id) return badRequest('request_id is required')
  if (!['approve', 'reject'].includes(action)) return badRequest('action must be "approve" or "reject"')
  if (action === 'reject' && !review_note?.trim()) {
    return badRequest('A review note is required when rejecting a request')
  }

  const db = createAdminClient()

  const { data: profile } = await db
    .from('users').select('id, role').eq('auth_id', user.id).single()

  if (!profile) return unauthorized()
  if (profile.role !== 'admin') return forbidden()

  // Fetch the request
  const { data: changeReq } = await db
    .from('mess_change_requests')
    .select('id, student_id, from_mess_id, to_mess_id, status')
    .eq('id', request_id)
    .single()

  if (!changeReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (changeReq.status !== 'pending') {
    return NextResponse.json({ error: 'This request has already been reviewed' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const today = dateToDateString(new Date())
  const endOfYear = `${new Date().getFullYear()}-12-31`

  // Update the request
  await db.from('mess_change_requests').update({
    status:         action === 'approve' ? 'approved' : 'rejected',
    reviewed_by:    profile.id,
    reviewed_at:    now,
    review_note:    review_note?.trim() ?? null,
    effective_date: action === 'approve' ? today : null,
  }).eq('id', request_id)

  // If approved — switch subscription
  if (action === 'approve') {
    await db.from('subscriptions')
      .update({ status: 'inactive' })
      .eq('student_id', changeReq.student_id)
      .eq('status', 'active')

    await db.from('subscriptions').insert({
      student_id: changeReq.student_id,
      mess_id:    changeReq.to_mess_id,
      status:     'active',
      start_date: today,
      end_date:   endOfYear,
      plan_name:  'Annual Plan',
      created_by: profile.id,
    })
  }

  return NextResponse.json({ success: true })
}
