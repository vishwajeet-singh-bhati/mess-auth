// app/api/admin/reports/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, unauthorized, forbidden } from '@/lib/auth/permissions'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try {
    await requireAdmin(user.id)
  } catch {
    return forbidden()
  }

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') ?? 'meal_logs'
  const days = parseInt(searchParams.get('days') ?? '30', 10)

  const db = createAdminClient()
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

  let csvContent = ''
  let filename = ''

  if (type === 'meal_logs') {
    const { data } = await db
      .from('meal_logs')
      .select(`
        meal_date, meal_type, mess_id, method, authorized_at,
        students ( roll_number, users ( full_name ) )
      `)
      .gte('meal_date', since)
      .order('meal_date', { ascending: false })
      .order('authorized_at', { ascending: false })

    const rows = (data ?? []).map(log => {
      const stu = (log.students as any)
      return [
        log.meal_date,
        stu?.roll_number ?? '',
        stu?.users?.full_name ?? '',
        log.meal_type,
        log.mess_id,
        log.method,
        new Date(log.authorized_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })

    csvContent = ['Date,Roll Number,Student Name,Meal Type,Mess,Method,Authorized At', ...rows].join('\n')
    filename = `meal-logs-${since}-to-${new Date().toISOString().split('T')[0]}.csv`
  }

  else if (type === 'denied_attempts') {
    const { data } = await db
      .from('authorization_attempts')
      .select(`
        attempted_at, mess_id, method, denial_reason, meal_type, roll_number,
        students ( roll_number, users ( full_name ) )
      `)
      .eq('was_successful', false)
      .gte('attempted_at', since + 'T00:00:00.000Z')
      .order('attempted_at', { ascending: false })

    const rows = (data ?? []).map(a => {
      const stu = (a.students as any)
      return [
        new Date(a.attempted_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
        a.roll_number ?? stu?.roll_number ?? '',
        stu?.users?.full_name ?? '',
        a.mess_id,
        a.meal_type ?? '',
        a.denial_reason ?? '',
        a.method,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })

    csvContent = ['Date,Roll Number,Student Name,Mess,Meal Type,Denial Reason,Method', ...rows].join('\n')
    filename = `denied-attempts-${since}-to-${new Date().toISOString().split('T')[0]}.csv`
  }

  else {
    return NextResponse.json({ error: 'Unknown export type' }, { status: 400 })
  }

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
