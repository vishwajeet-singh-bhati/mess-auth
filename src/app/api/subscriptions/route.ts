// app/api/subscriptions/route.ts
// GET  → student's current + past subscriptions
// POST → admin creates a new subscription

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unauthorized, forbidden, badRequest } from '@/lib/auth/permissions'
import { dateToDateString } from '@/lib/meal/slots'
import type { MessId } from '@/types/database'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const db = createAdminClient()

  const { data: profile } = await db
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!profile) return unauthorized()

  if (profile.role === 'student') {
    const { data: student } = await db
      .from('students')
      .select('id')
      .eq('user_id', profile.id)
      .single()

    if (!student) return NextResponse.json({ data: [] })

    const today = dateToDateString(new Date())

    const { data, error } = await db
      .from('subscriptions')
      .select('id, mess_id, status, start_date, end_date, plan_name, monthly_fee, created_at, messes(name)')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Mark which subscription is currently active
    const enriched = (data ?? []).map(sub => ({
      ...sub,
      is_current: sub.status === 'active'
        && sub.start_date <= today
        && sub.end_date >= today,
    }))

    return NextResponse.json({ data: enriched })
  }

  // Admin/staff: return all
  if (!['admin', 'staff'].includes(profile.role)) return forbidden()

  const { searchParams } = req.nextUrl
  const studentId = searchParams.get('student_id')

  let query = db
    .from('subscriptions')
    .select(`
      id, mess_id, status, start_date, end_date, plan_name, monthly_fee, created_at,
      students(roll_number, users(full_name))
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (studentId) query = query.eq('student_id', studentId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
