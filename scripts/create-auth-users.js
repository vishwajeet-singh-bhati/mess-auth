#!/usr/bin/env node
// scripts/create-auth-users.js
//
// Creates Supabase Auth users for all demo accounts and updates
// the public.users table with the real auth UUIDs.
//
// Run AFTER applying migrations:
//   node scripts/create-auth-users.js
//
// Requires:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Usage:
//   node scripts/create-auth-users.js
//   node scripts/create-auth-users.js --reset   (delete + recreate all)

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── Demo users to create ────────────────────────────────────────────────────

const DEMO_USERS = [
  // ── Admin ──
  {
    email:     'admin@messsystem.in',
    password:  'MessAuth@2024',
    role:      'admin',
    full_name: 'Dr. Ramesh Kumar',
  },

  // ── Staff ──
  {
    email:     'staff.a@messsystem.in',
    password:  'MessAuth@2024',
    role:      'staff',
    full_name: 'Suresh Naidu',
    mess_id:   'mess_a',
  },
  {
    email:     'staff.b@messsystem.in',
    password:  'MessAuth@2024',
    role:      'staff',
    full_name: 'Ganesh Iyer',
    mess_id:   'mess_b',
  },

  // ── Students ──
  { email: 'cs21b001@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Arjun Sharma',        roll: 'CS21B001' },
  { email: 'ee21b042@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Priya Patel',         roll: 'EE21B042' },
  { email: 'me22b015@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Rahul Verma',         roll: 'ME22B015' },
  { email: 'cs21b078@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Sneha Rao',           roll: 'CS21B078' },
  { email: 'it22b033@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Kiran Nair',          roll: 'IT22B033' },
  { email: 'ec21b056@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Deepak Mishra',       roll: 'EC21B056' },
  { email: 'ce22b009@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Anjali Singh',        roll: 'CE22B009' },
  { email: 'cs22b024@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Vikram Reddy',        roll: 'CS22B024' },
  { email: 'ee22b061@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Meera Krishnan',      roll: 'EE22B061' },
  { email: 'me21b038@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Rohan Gupta',         roll: 'ME21B038' },
  { email: 'it21b019@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Fatima Sheikh',       roll: 'IT21B019' },
  { email: 'cs23b005@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Aarav Joshi',         roll: 'CS23B005' },
  { email: 'ec23b017@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Nandini Pillai',      roll: 'EC23B017' },
  { email: 'ce21b047@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Siddharth Menon',     roll: 'CE21B047' },
  { email: 'me23b031@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Pooja Agarwal',       roll: 'ME23B031' },
  { email: 'cs21b093@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Tanmay Kulkarni',     roll: 'CS21B093' },
  { email: 'ee23b055@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Divya Nair',          roll: 'EE23B055' },
  { email: 'it23b042@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Harsh Trivedi',       roll: 'IT23B042' },
  { email: 'cs22b067@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Riya Desai',          roll: 'CS22B067' },
  { email: 'me22b088@student.in', password: 'MessAuth@2024', role: 'student', full_name: 'Aditya Bhatt',        roll: 'ME22B088' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(emoji, msg) { console.log(`${emoji}  ${msg}`) }

async function deleteExistingUser(email) {
  const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 })
  const existing = users.find(u => u.email === email)
  if (existing) {
    await db.auth.admin.deleteUser(existing.id)
    log('🗑', `Deleted existing auth user: ${email}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const reset = process.argv.includes('--reset')
  log('🚀', `Starting user setup (reset=${reset})`)
  console.log('')

  let created = 0
  let skipped = 0
  let failed  = 0

  for (const user of DEMO_USERS) {

    // Delete existing if reset
    if (reset) await deleteExistingUser(user.email)

    // 1. Create Supabase Auth user
    const { data: authData, error: authErr } = await db.auth.admin.createUser({
      email:        user.email,
      password:     user.password,
      user_metadata: { role: user.role, full_name: user.full_name },
      email_confirm: true,
    })

    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        log('⏭', `Skipped (exists): ${user.email}`)
        skipped++
        continue
      }
      log('❌', `Failed to create auth user: ${user.email} — ${authErr.message}`)
      failed++
      continue
    }

    const authId = authData.user.id
    log('✓ ', `Auth user created: ${user.email} → ${authId}`)

    // 2. Upsert public.users with real auth_id
    const { data: userRecord, error: userErr } = await db
      .from('users')
      .upsert({
        auth_id:   authId,
        email:     user.email,
        full_name: user.full_name,
        role:      user.role,
        is_active: true,
      }, { onConflict: 'email' })
      .select('id')
      .single()

    if (userErr || !userRecord) {
      log('⚠ ', `public.users upsert failed for ${user.email}: ${userErr?.message}`)
      failed++
      continue
    }

    // 3. For staff: create mess mapping if not exists
    if (user.role === 'staff' && user.mess_id) {
      await db.from('staff_mess_mapping').upsert({
        user_id:    userRecord.id,
        mess_id:    user.mess_id,
        is_primary: true,
      }, { onConflict: 'user_id,mess_id' })
      log('  ', `  Staff mess mapping: ${user.mess_id}`)
    }

    // 4. For students: update students.user_id to match public.users.id
    if (user.role === 'student' && user.roll) {
      const { error: stuErr } = await db
        .from('students')
        .update({ user_id: userRecord.id })
        .eq('roll_number', user.roll)

      if (stuErr) {
        log('⚠ ', `  Student link failed for ${user.roll}: ${stuErr.message}`)
      } else {
        log('  ', `  Linked student: ${user.roll}`)
      }
    }

    // 5. For subscriptions: update created_by if it was admin
    // (done after all users created — see post-processing below)

    created++
  }

  console.log('')
  log('📊', `Results: ${created} created, ${skipped} skipped, ${failed} failed`)

  // ── Post-processing: fix subscription created_by ───────────────────────────
  if (created > 0) {
    const { data: adminUser } = await db
      .from('users')
      .select('id')
      .eq('email', 'admin@messsystem.in')
      .single()

    if (adminUser) {
      await db
        .from('subscriptions')
        .update({ created_by: adminUser.id })
        .is('created_by', null)
      log('🔧', 'Fixed subscription created_by references')
    }
  }

  console.log('')
  log('✅', 'Setup complete! You can now log in with:')
  console.log('')
  console.log('  Role        Email                        Password')
  console.log('  ─────────── ──────────────────────────── ────────────')
  console.log('  Admin       admin@messsystem.in          MessAuth@2024')
  console.log('  Staff A     staff.a@messsystem.in        MessAuth@2024')
  console.log('  Staff B     staff.b@messsystem.in        MessAuth@2024')
  console.log('  Student     cs21b001@student.in          MessAuth@2024')
  console.log('  (blocked)   cs21b078@student.in          MessAuth@2024')
  console.log('  (no sub)    me22b015@student.in          MessAuth@2024')
  console.log('')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
