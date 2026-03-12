// app/api/meals/logs/route.ts
// Returns meal logs for the authenticated user.
// Students see own logs; staff/admin see their mess or all.
//
// GET /api/meals/logs?limit=30&before=<iso-date>

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unauthorized } from '@/lib/auth/permissions'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const db = createAdminClient()
  const { searchParams } = req.nextUrl

  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100)
  const before = searchParams.get('before')

  // Get user profile to determine role
  const { data: profile } = await db
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!profile) return unauthorized()

  if (profile.role === 'student') {
    // Student: fetch own logs
    const { data: student } = await db
      .from('students')
      .select('id')
      .eq('user_id', profile.id)
      .single()

    if (!student) return NextResponse.json({ data: [] })

    let query = db
      .from('meal_logs')
      .select('id, meal_type, mess_id, meal_date, authorized_at, method, messes(name)')
      .eq('student_id', student.id)
      .order('authorized_at', { ascending: false })
      .limit(limit)

    if (before) query = query.lt('authorized_at', before)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // Staff/Admin: paginated full logs
  const messFilter = searchParams.get('mess')
  const dateFilter = searchParams.get('date')

  let query = db
    .from('meal_logs')
    .select(`
      id, meal_type, mess_id, meal_date, authorized_at, method,
      students (roll_number, users(full_name))
    `)
    .order('authorized_at', { ascending: false })
    .limit(limit)

  if (messFilter) query = query.eq('mess_id', messFilter)
  if (dateFilter) query = query.eq('meal_date', dateFilter)
  if (before) query = query.lt('authorized_at', before)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
