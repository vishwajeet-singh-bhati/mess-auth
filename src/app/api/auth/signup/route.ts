// app/api/auth/signup/route.ts
// POST — verifies OTP then creates the student account.
// OTP must have been sent first via /api/auth/otp/send
// Creates auth user + users row + students row atomically.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { badRequest } from '@/lib/auth/permissions'

const ALLOWED_DOMAIN = '@iiitk.ac.in'
const VALID_HOSTELS  = ['MVHR', 'Kalam', 'SRK', 'Kalpana']
const VALID_WINGS    = ['Wing A', 'Wing B']

export async function POST(req: NextRequest) {
  let body: {
    email:       string
    password:    string
    full_name:   string
    roll_number: string
    hostel:      string
    wing?:       string
    room_number: string
    otp:         string
  }

  try { body = await req.json() }
  catch { return badRequest('Invalid JSON') }

  const { email, password, full_name, roll_number, hostel, wing, room_number, otp } = body

  // ── Validate fields ───────────────────────────────────────────────────────
  if (!email?.trim()) return badRequest('Email is required')
  if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    return NextResponse.json(
      { error: `Only ${ALLOWED_DOMAIN} email addresses are allowed` },
      { status: 403 }
    )
  }
  if (!otp || otp.length !== 4 || !/^\d{4}$/.test(otp)) {
    return badRequest('A valid 4-digit OTP is required')
  }
  if (!password || password.length < 8) return badRequest('Password must be at least 8 characters')
  if (!full_name?.trim()) return badRequest('Full name is required')
  if (!roll_number?.trim()) return badRequest('Roll number is required')
  if (!hostel || !VALID_HOSTELS.includes(hostel)) return badRequest(`Hostel must be one of: ${VALID_HOSTELS.join(', ')}`)
  if (hostel !== 'SRK' && (!wing || !VALID_WINGS.includes(wing))) {
    return badRequest('Wing is required for this hostel')
  }
  if (!room_number?.trim()) return badRequest('Room number is required')

  const normalizedEmail = email.trim().toLowerCase()
  const hostel_block = hostel === 'SRK' ? hostel : `${hostel} - ${wing}`
  const db = createAdminClient()

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const now = new Date().toISOString()

  const { data: otpRecord } = await db
    .from('otp_verifications')
    .select('id, otp_code, expires_at, is_used')
    .eq('email', normalizedEmail)
    .eq('is_used', false)
    .gte('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!otpRecord) {
    return NextResponse.json(
      { error: 'OTP has expired or is invalid. Please request a new one.' },
      { status: 400 }
    )
  }

  if (otpRecord.otp_code !== otp) {
    return NextResponse.json(
      { error: 'Incorrect OTP. Please check and try again.' },
      { status: 400 }
    )
  }

  // Mark OTP as used immediately to prevent reuse
  await db.from('otp_verifications').update({ is_used: true }).eq('id', otpRecord.id)

  // ── Check if email already exists ─────────────────────────────────────────
  const { data: existingUser } = await db
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingUser) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    )
  }

  // ── Create auth user ──────────────────────────────────────────────────────
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email:         normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      role:         'student',
      full_name:    full_name.trim(),
      roll_number:  roll_number.trim().toUpperCase(),
      hostel_block,
      room_number:  room_number.trim(),
    },
  })

  if (authError || !authData.user) {
    console.error('Auth user creation error:', authError)
    return NextResponse.json(
      { error: authError?.message ?? 'Failed to create account' },
      { status: 500 }
    )
  }

  // ── Create users row ──────────────────────────────────────────────────────
  const { data: userRow, error: userError } = await db
    .from('users')
    .insert({
      auth_id:   authData.user.id,
      email:     normalizedEmail,
      full_name: full_name.trim(),
      role:      'student',
    })
    .select('id')
    .single()

  if (userError || !userRow) {
    await db.auth.admin.deleteUser(authData.user.id)
    console.error('User row error:', userError)
    return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
  }

  // ── Create students row ───────────────────────────────────────────────────
  const { error: studentError } = await db.from('students').insert({
    user_id:      userRow.id,
    roll_number:  roll_number.trim().toUpperCase(),
    hostel_block,
    room_number:  room_number.trim(),
  })

  if (studentError) {
    await db.auth.admin.deleteUser(authData.user.id)
    await db.from('users').delete().eq('id', userRow.id)
    console.error('Student row error:', studentError)
    return NextResponse.json({ error: 'Failed to create student record' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}