// app/api/auth/signup/route.ts
// POST — registers a new student account.
// Only @iiitk.ac.in emails are accepted.
// Creates auth user + users row + students row in one transaction.

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
  }

  try { body = await req.json() }
  catch { return badRequest('Invalid JSON') }

  const { email, password, full_name, roll_number, hostel, wing, room_number } = body

  // ── Validate fields ───────────────────────────────────────────────────────
  if (!email?.trim()) return badRequest('Email is required')
  if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    return NextResponse.json(
      { error: `Only ${ALLOWED_DOMAIN} email addresses are allowed` },
      { status: 403 }
    )
  }

  if (!password || password.length < 8) {
    return badRequest('Password must be at least 8 characters')
  }

  if (!full_name?.trim()) return badRequest('Full name is required')
  if (!roll_number?.trim()) return badRequest('Roll number is required')

  if (!hostel || !VALID_HOSTELS.includes(hostel)) {
    return badRequest(`Hostel must be one of: ${VALID_HOSTELS.join(', ')}`)
  }

  if (hostel !== 'SRK') {
    if (!wing || !VALID_WINGS.includes(wing)) {
      return badRequest('Wing is required for this hostel (Wing A or Wing B)')
    }
  }

  if (!room_number?.trim()) return badRequest('Room number is required')

  const hostel_block = hostel === 'SRK' ? hostel : `${hostel} - ${wing}`

  const db = createAdminClient()

  // ── Check if email already exists ─────────────────────────────────────────
  const { data: existingUser } = await db
    .from('users')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existingUser) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    )
  }

  // ── Create auth user ──────────────────────────────────────────────────────
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email:          email.trim().toLowerCase(),
    password,
    email_confirm:  true,   // skip email confirmation for institute accounts
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
      email:     email.trim().toLowerCase(),
      full_name: full_name.trim(),
      role:      'student',
    })
    .select('id')
    .single()

  if (userError || !userRow) {
    // Rollback auth user
    await db.auth.admin.deleteUser(authData.user.id)
    console.error('User row creation error:', userError)
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
    // Rollback both
    await db.auth.admin.deleteUser(authData.user.id)
    await db.from('users').delete().eq('id', userRow.id)
    console.error('Student row creation error:', studentError)
    return NextResponse.json({ error: 'Failed to create student record' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
