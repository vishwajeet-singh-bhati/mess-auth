// app/api/admin/staff/route.ts
// Creates a new staff Supabase Auth user + public.users + staff_mess_mapping
// Requires admin session.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, unauthorized, badRequest, forbidden } from '@/lib/auth/permissions'
import type { MessId } from '@/types/database'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try { await requireAdmin(user.id) } catch (res) {
    if (res instanceof Response) return res
    return forbidden()
  }

  let body: { email: string; full_name: string; password: string; mess_id: MessId }
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const { email, full_name, password, mess_id } = body
  if (!email || !full_name || !password || !mess_id) {
    return badRequest('email, full_name, password, and mess_id are required')
  }

  if (password.length < 8) return badRequest('Password must be at least 8 characters')

  const db = createAdminClient()

  // 1. Create Supabase Auth user
  const { data: authData, error: authErr } = await db.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    user_metadata: { role: 'staff', full_name: full_name.trim() },
    email_confirm: true,   // skip email verification for admin-created accounts
  })

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  const authUser = authData.user
  if (!authUser) return NextResponse.json({ error: 'Auth user creation failed' }, { status: 500 })

  // 2. Create public.users record
  const { data: userRecord, error: userErr } = await db.from('users').insert({
    auth_id:   authUser.id,
    email:     email.trim().toLowerCase(),
    full_name: full_name.trim(),
    role:      'staff',
    is_active: true,
  }).select('id').single()

  if (userErr || !userRecord) {
    // Rollback auth user
    await db.auth.admin.deleteUser(authUser.id)
    return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
  }

  // 3. Create staff_mess_mapping
  const { error: mappingErr } = await db.from('staff_mess_mapping').insert({
    user_id:   userRecord.id,
    mess_id,
    is_primary: true,
  })

  if (mappingErr) {
    console.error('[admin/staff] Mess mapping error:', mappingErr)
    // Non-fatal — can be assigned from the UI
  }

  return NextResponse.json({ success: true, userId: userRecord.id }, { status: 201 })
}
