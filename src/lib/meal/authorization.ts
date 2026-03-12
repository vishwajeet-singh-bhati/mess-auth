// lib/meal/authorization.ts
// ============================================================
// CORE AUTHORIZATION ENGINE
// ============================================================
// This module is the single source of truth for all meal
// authorization logic. All validation happens server-side.
//
// Authorization pipeline (in order):
//   1. Verify QR token signature & expiry
//   2. Check token not replayed (DB lookup by jti)
//   3. Fetch student profile & check active/not-blocked
//   4. Check active subscription exists for TODAY
//   5. Check subscription is for the CORRECT mess
//      (or temporary permission override)
//   6. Determine active meal slot from DB config
//   7. Check student hasn't already consumed this slot today
//   8. AUTHORIZE: mark token used + write meal_log
//   9. Log all attempts (success & denied) for reporting
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import {
  verifyToken,
  hashToken,
  QRTokenError,
} from '@/lib/qr/tokens'
import {
  getCurrentMealSlot,
  dateToDateString,
} from '@/lib/meal/slots'
import type {
  AuthResponse,
  MealAuthSuccessData,
} from '@/types/api'
import type {
  DenialReason,
  MessId,
  AuthorizationMethod,
} from '@/types/database'

// ─── Denial message copy ─────────────────────────────────────────────────────

const DENIAL_MESSAGES: Record<DenialReason, string> = {
  wrong_mess:
    'You are not subscribed to this mess. Please go to your subscribed mess entrance.',
  already_consumed:
    'You have already consumed this meal today. Each meal can only be taken once per slot.',
  outside_meal_hours:
    'No active meal slot right now. Please check the mess timings board.',
  inactive_subscription:
    'Your mess subscription is not currently active. Contact the hostel office.',
  expired_qr:
    'This QR code has expired. A fresh code appears at the entrance every 30 seconds.',
  invalid_qr:
    'Invalid QR code. Please scan the official QR displayed at the mess entrance.',
  invalid_token:
    'Token verification failed. Please re-scan the mess entrance QR.',
  blocked_student:
    'Your account has been blocked. Please visit the hostel office for assistance.',
  no_subscription:
    'You do not have an active mess subscription. Please register at the hostel office.',
  qr_already_used:
    'This QR code has already been used. A new code refreshes every 30 seconds — please scan the current one.',
  student_not_found:
    'Student account not found. Please contact the hostel office.',
}

// ─── Context passed to all log functions ────────────────────────────────────

interface AttemptContext {
  messId: MessId
  studentId?: string
  rollNumber?: string
  qrSessionId?: string
  method: AuthorizationMethod
  ipAddress?: string
  userAgent?: string
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function denied(reason: DenialReason): AuthResponse {
  return {
    success: false,
    reason,
    message: DENIAL_MESSAGES[reason],
  }
}

async function logAttempt(
  ctx: AttemptContext,
  wasSuccessful: boolean,
  denialReason?: DenialReason,
  mealType?: string
) {
  const db = createAdminClient()
  try {
    await db.from('authorization_attempts').insert({
      student_id:     ctx.studentId   ?? null,
      roll_number:    ctx.rollNumber  ?? null,
      mess_id:        ctx.messId,
      qr_session_id:  ctx.qrSessionId ?? null,
      method:         ctx.method,
      was_successful: wasSuccessful,
      denial_reason:  (denialReason ?? null) as any,
      meal_type:      (mealType    ?? null) as any,
      ip_address:     ctx.ipAddress  ?? null,
      user_agent:     ctx.userAgent  ?? null,
      attempted_at:   new Date().toISOString(),
    })
  } catch (err) {
    // Logging must never break authorization flow
    console.error('[authorization] Failed to log attempt:', err)
  }
}

// ─── QR-based authorization ──────────────────────────────────────────────────

/**
 * Authorize a student meal via QR scan.
 *
 * Called from: POST /api/auth/scan
 * Requires: valid Supabase session (student auth_id)
 *
 * @param qrToken       - Raw token string decoded from QR
 * @param studentAuthId - Supabase auth.users.id of the scanning student
 * @param ipAddress     - Request IP for audit
 * @param userAgent     - Request User-Agent for audit
 */
export async function authorizeViaScan(
  qrToken: string,
  studentAuthId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResponse> {
  const db = createAdminClient()
  const now = new Date()

  // ── STEP 1: Verify token signature & expiry ──────────────────────────────
  let tokenPayload
  try {
    tokenPayload = verifyToken(qrToken)
  } catch (err) {
    const code = err instanceof QRTokenError ? err.code : 'UNKNOWN'
    const reason: DenialReason =
      code === 'TOKEN_EXPIRED' ? 'expired_qr' : 'invalid_qr'

    // We don't have messId from an invalid token — use 'mess_a' as fallback for logging
    await logAttempt(
      { messId: 'mess_a', method: 'qr_scan', ipAddress, userAgent },
      false,
      reason
    )
    return denied(reason)
  }

  const messId = tokenPayload.mess_id as MessId
  const ctx: AttemptContext = {
    messId,
    method: 'qr_scan',
    ipAddress,
    userAgent,
  }

  // ── STEP 2: Check token replay (jti uniqueness) ──────────────────────────
  const tokenHash = hashToken(qrToken)

  const { data: qrSession } = await db
    .from('qr_sessions')
    .select('id, is_used, expires_at')
    .eq('id', tokenPayload.jti)           // jti == qr_sessions.id
    .single()

  // If session doesn't exist in DB, token was never registered (forged/invalid)
  if (!qrSession) {
    await logAttempt(ctx, false, 'invalid_token')
    return denied('invalid_token')
  }

  if (qrSession.is_used) {
    ctx.qrSessionId = qrSession.id
    await logAttempt(ctx, false, 'qr_already_used')
    return denied('qr_already_used')
  }

  ctx.qrSessionId = qrSession.id

  // ── STEP 3: Fetch student profile ────────────────────────────────────────
  const { data: userRecord } = await db
    .from('users')
    .select(`
      id,
      full_name,
      is_active,
      students (
        id,
        roll_number,
        is_blocked,
        block_reason
      )
    `)
    .eq('auth_id', studentAuthId)
    .single()

  if (!userRecord || !userRecord.is_active) {
    await logAttempt(ctx, false, 'blocked_student')
    return denied('blocked_student')
  }

  const student = (userRecord.students as any)?.[0]
  if (!student) {
    await logAttempt(ctx, false, 'student_not_found')
    return denied('student_not_found')
  }

  ctx.studentId  = student.id
  ctx.rollNumber = student.roll_number

  if (student.is_blocked) {
    await logAttempt(ctx, false, 'blocked_student')
    return {
      success: false,
      reason: 'blocked_student',
      message: student.block_reason
        ? `Access blocked: ${student.block_reason}`
        : DENIAL_MESSAGES['blocked_student'],
    }
  }

  // ── STEP 4: Check active subscription ───────────────────────────────────
  const today = dateToDateString(now)

  const { data: subscription } = await db
    .from('subscriptions')
    .select('id, mess_id, end_date, status')
    .eq('student_id', student.id)
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
    .single()

  if (!subscription) {
    await logAttempt(ctx, false, 'no_subscription')
    return denied('no_subscription')
  }

  // ── STEP 5: Check mess match (or temporary permission) ───────────────────
  if (subscription.mess_id !== messId) {
    // Check for an admin-granted temporary override
    const { data: tempPerm } = await db
      .from('temporary_permissions')
      .select('id')
      .eq('student_id', student.id)
      .eq('mess_id', messId)
      .eq('is_active', true)
      .lte('valid_from', now.toISOString())
      .gte('valid_until', now.toISOString())
      .limit(1)
      .maybeSingle()

    if (!tempPerm) {
      await logAttempt(ctx, false, 'wrong_mess')
      return denied('wrong_mess')
    }
    // Temp permission found — proceed with authorization
  }

  // ── STEP 6: Determine current meal slot ──────────────────────────────────
  const { data: mealSlots } = await db
    .from('meal_slots')
    .select('meal_type, start_time, end_time, is_active')
    .eq('mess_id', messId)
    .eq('is_active', true)

  const activeSlot = getCurrentMealSlot(mealSlots ?? [], now)

  if (!activeSlot) {
    await logAttempt(ctx, false, 'outside_meal_hours')
    return denied('outside_meal_hours')
  }

  // ── STEP 7: Check duplicate meal ────────────────────────────────────────
  const { data: existingMeal } = await db
    .from('meal_logs')
    .select('id')
    .eq('student_id', student.id)
    .eq('meal_type', activeSlot.meal_type)
    .eq('meal_date', today)
    .maybeSingle()

  if (existingMeal) {
    await logAttempt(ctx, false, 'already_consumed', activeSlot.meal_type)
    return denied('already_consumed')
  }

  // ── STEP 8: AUTHORIZE ────────────────────────────────────────────────────
  // All checks passed. Atomically:
  //   a) Mark QR session as used (prevents replay)
  //   b) Write meal log (prevents duplicate within this request)

  const [markUsedResult, mealLogResult] = await Promise.all([
    // Mark QR token as used
    db
      .from('qr_sessions')
      .update({
        is_used: true,
        used_at: now.toISOString(),
        used_by: student.id,
      })
      .eq('id', qrSession.id)
      .eq('is_used', false),   // optimistic lock: only update if still unused

    // Create meal log
    db.from('meal_logs').insert({
      student_id:      student.id,
      mess_id:         messId,
      meal_type:       activeSlot.meal_type,
      meal_date:       today,
      authorized_at:   now.toISOString(),
      method:          'qr_scan',
      qr_session_id:   qrSession.id,
      subscription_id: subscription.id,
    }),
  ])

  // If QR was already marked used by a concurrent request — deny
  if (markUsedResult.error) {
    await logAttempt(ctx, false, 'qr_already_used', activeSlot.meal_type)
    return denied('qr_already_used')
  }

  if (mealLogResult.error) {
    // Meal log insert failed — likely a race condition duplicate
    // The UNIQUE constraint on meal_logs fires here
    if (mealLogResult.error.code === '23505') {
      await logAttempt(ctx, false, 'already_consumed', activeSlot.meal_type)
      return denied('already_consumed')
    }
    console.error('[authorization] Meal log insert failed:', mealLogResult.error)
    await logAttempt(ctx, false, 'invalid_token', activeSlot.meal_type)
    return denied('invalid_token')
  }

  // Fetch mess name for response
  const { data: mess } = await db
    .from('messes')
    .select('name')
    .eq('id', messId)
    .single()

  // Log successful attempt
  await logAttempt(ctx, true, undefined, activeSlot.meal_type)

  const responseData: MealAuthSuccessData = {
    student_name:              userRecord.full_name,
    roll_number:               student.roll_number,
    mess_name:                 mess?.name ?? messId,
    meal_type:                 activeSlot.meal_type,
    authorized_at:             now.toISOString(),
    subscription_valid_until:  subscription.end_date,
    method:                    'qr_scan',
  }

  return { success: true, data: responseData }
}

// ─── Manual staff authorization ──────────────────────────────────────────────

/**
 * Authorize a student meal via manual roll number entry by staff.
 * Runs the same eligibility checks as QR scan.
 * All manual actions are logged to both authorization_attempts and audit_logs.
 *
 * Called from: POST /api/auth/manual
 * Requires: valid Supabase session with role = 'staff'
 *
 * @param rollNumber  - Student roll number entered by staff
 * @param staffUserId - Internal users.id of the staff member
 * @param staffMessId - Mess the staff member manages
 * @param ipAddress   - Request IP for audit
 */
export async function authorizeViaManual(
  rollNumber: string,
  staffUserId: string,
  staffMessId: MessId,
  ipAddress?: string
): Promise<AuthResponse> {
  const db = createAdminClient()
  const now = new Date()
  const today = dateToDateString(now)

  const ctx: AttemptContext = {
    messId: staffMessId,
    rollNumber: rollNumber.toUpperCase(),
    method: 'manual_staff',
    ipAddress,
  }

  // Fetch student by roll number
  const { data: student } = await db
    .from('students')
    .select(`
      id,
      roll_number,
      is_blocked,
      block_reason,
      users!inner (
        id,
        full_name,
        is_active
      )
    `)
    .eq('roll_number', rollNumber.toUpperCase())
    .single()

  if (!student) {
    await logAttempt(ctx, false, 'student_not_found')
    return denied('student_not_found')
  }

  const userRecord = (student.users as any)?.[0] ?? student.users

  ctx.studentId = student.id

  if (student.is_blocked || !userRecord.is_active) {
    await logAttempt(ctx, false, 'blocked_student')
    return {
      success: false,
      reason: 'blocked_student',
      message: student.block_reason
        ? `Account blocked: ${student.block_reason}`
        : DENIAL_MESSAGES['blocked_student'],
    }
  }

  // Check subscription
  const { data: subscription } = await db
    .from('subscriptions')
    .select('id, mess_id, end_date')
    .eq('student_id', student.id)
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
    .single()

  if (!subscription) {
    await logAttempt(ctx, false, 'no_subscription')
    return denied('no_subscription')
  }

  if (subscription.mess_id !== staffMessId) {
    await logAttempt(ctx, false, 'wrong_mess')
    return denied('wrong_mess')
  }

  // Check meal slot
  const { data: mealSlots } = await db
    .from('meal_slots')
    .select('meal_type, start_time, end_time, is_active')
    .eq('mess_id', staffMessId)
    .eq('is_active', true)

  const activeSlot = getCurrentMealSlot(mealSlots ?? [], now)

  if (!activeSlot) {
    await logAttempt(ctx, false, 'outside_meal_hours')
    return denied('outside_meal_hours')
  }

  // Check duplicate
  const { data: existingMeal } = await db
    .from('meal_logs')
    .select('id')
    .eq('student_id', student.id)
    .eq('meal_type', activeSlot.meal_type)
    .eq('meal_date', today)
    .maybeSingle()

  if (existingMeal) {
    await logAttempt(ctx, false, 'already_consumed', activeSlot.meal_type)
    return denied('already_consumed')
  }

  // Authorize
  const { error: insertError } = await db.from('meal_logs').insert({
    student_id:      student.id,
    mess_id:         staffMessId,
    meal_type:       activeSlot.meal_type,
    meal_date:       today,
    authorized_at:   now.toISOString(),
    method:          'manual_staff',
    authorized_by:   staffUserId,
    subscription_id: subscription.id,
  })

  if (insertError?.code === '23505') {
    await logAttempt(ctx, false, 'already_consumed', activeSlot.meal_type)
    return denied('already_consumed')
  }

  if (insertError) {
    console.error('[authorization] Manual meal log insert failed:', insertError)
    return denied('invalid_token')
  }

  // Audit log for manual entry
  await db.from('audit_logs').insert({
    actor_id:    staffUserId,
    action:      'manual_verification',
    target_type: 'student',
    target_id:   student.id,
    notes:       `Manual auth: ${rollNumber} for ${activeSlot.meal_type} at ${staffMessId}`,
    ip_address:  ipAddress ?? null,
  })

  await logAttempt(ctx, true, undefined, activeSlot.meal_type)

  const { data: mess } = await db
    .from('messes')
    .select('name')
    .eq('id', staffMessId)
    .single()

  return {
    success: true,
    data: {
      student_name:              userRecord.full_name,
      roll_number:               student.roll_number,
      mess_name:                 mess?.name ?? staffMessId,
      meal_type:                 activeSlot.meal_type,
      authorized_at:             now.toISOString(),
      subscription_valid_until:  subscription.end_date,
      method:                    'manual_staff',
    },
  }
}
