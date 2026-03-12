#!/usr/bin/env node
// scripts/db-check.js
// Verifies the database is set up correctly before going live.
// Run after migrations + create-auth-users.
//
// Usage: node scripts/db-check.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

let passed = 0
let failed = 0

async function check(label, fn) {
  try {
    const result = await fn()
    if (result === false) throw new Error('assertion failed')
    console.log(`  ✓  ${label}`)
    passed++
  } catch (err) {
    console.log(`  ✗  ${label} — ${err.message}`)
    failed++
  }
}

async function main() {
  console.log('\n🔍  Mess Auth System — Database Health Check\n')

  // ── Schema checks ───────────────────────────────────────────────────────────
  console.log('Schema')
  const tables = ['users','students','messes','subscriptions','meal_slots',
                  'qr_sessions','qr_config','meal_logs','authorization_attempts',
                  'mess_change_requests','temporary_permissions','audit_logs','staff_mess_mapping']

  for (const t of tables) {
    await check(`Table: ${t}`, async () => {
      const { error } = await db.from(t).select('*', { count: 'exact', head: true })
      if (error) throw new Error(error.message)
    })
  }

  // ── Seed data checks ────────────────────────────────────────────────────────
  console.log('\nSeed Data')

  await check('Messes seeded (2)', async () => {
    const { count } = await db.from('messes').select('*', { count: 'exact', head: true })
    return count === 2
  })

  await check('Meal slots seeded (8)', async () => {
    const { count } = await db.from('meal_slots').select('*', { count: 'exact', head: true })
    return count >= 8
  })

  await check('QR config seeded (2)', async () => {
    const { count } = await db.from('qr_config').select('*', { count: 'exact', head: true })
    return count === 2
  })

  await check('Students seeded (≥10)', async () => {
    const { count } = await db.from('students').select('*', { count: 'exact', head: true })
    return count >= 10
  })

  await check('Subscriptions seeded (≥10)', async () => {
    const { count } = await db.from('subscriptions').select('*', { count: 'exact', head: true })
    return count >= 10
  })

  // ── Auth user checks ────────────────────────────────────────────────────────
  console.log('\nAuth Users')

  const testEmails = [
    'admin@messsystem.in',
    'staff.a@messsystem.in',
    'cs21b001@student.in',
  ]

  for (const email of testEmails) {
    await check(`Auth user exists: ${email}`, async () => {
      const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 })
      return users.some(u => u.email === email)
    })
  }

  await check('public.users linked to auth', async () => {
    const { data } = await db
      .from('users')
      .select('auth_id')
      .limit(5)
    return data?.every(u => u.auth_id && u.auth_id !== '11111111-0000-0000-0000-000000000001')
  })

  // ── Function checks ─────────────────────────────────────────────────────────
  console.log('\nDatabase Functions')

  await check('fn_expire_subscriptions()', async () => {
    const { error } = await db.rpc('fn_expire_subscriptions')
    if (error) throw new Error(error.message)
  })

  await check('fn_cleanup_qr_sessions()', async () => {
    const { error } = await db.rpc('fn_cleanup_qr_sessions')
    if (error) throw new Error(error.message)
  })

  // ── View checks ─────────────────────────────────────────────────────────────
  console.log('\nViews')

  for (const view of ['v_daily_meal_summary', 'v_today_authorizations', 'v_student_subscription_status']) {
    await check(`View: ${view}`, async () => {
      const { error } = await db.from(view).select('*', { count: 'exact', head: true })
      if (error) throw new Error(error.message)
    })
  }

  // ── QR signing secret check ─────────────────────────────────────────────────
  console.log('\nEnvironment')

  await check('QR_SIGNING_SECRET set and long enough', async () => {
    const secret = process.env.QR_SIGNING_SECRET
    return secret && secret.length >= 32
  })

  await check('NEXT_PUBLIC_SUPABASE_URL is set', async () => {
    return !!process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  await check('SUPABASE_SERVICE_ROLE_KEY is set', async () => {
    return !!process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  // ── Staff mess mapping ──────────────────────────────────────────────────────
  console.log('\nStaff Configuration')

  await check('Staff mapped to mess_a', async () => {
    const { count } = await db
      .from('staff_mess_mapping')
      .select('*', { count: 'exact', head: true })
      .eq('mess_id', 'mess_a')
    return count >= 1
  })

  await check('Staff mapped to mess_b', async () => {
    const { count } = await db
      .from('staff_mess_mapping')
      .select('*', { count: 'exact', head: true })
      .eq('mess_id', 'mess_b')
    return count >= 1
  })

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(42)}`)
  console.log(`  ${passed} passed · ${failed} failed`)

  if (failed === 0) {
    console.log('\n  ✅  All checks passed — ready to deploy!\n')
  } else {
    console.log('\n  ⚠️   Fix the failed checks before deploying.\n')
    console.log('  Common fixes:')
    console.log('    1. Run migrations:  supabase db push')
    console.log('    2. Create users:    node scripts/create-auth-users.js')
    console.log('    3. Set env vars:    cp .env.example .env.local && fill in values\n')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message)
  process.exit(1)
})
