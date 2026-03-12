// lib/auth/permissions.ts
// Server-side permission helpers for Route Handlers.
// Always call these AFTER getting the user from Supabase Auth.

import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole, MessId } from '@/types/database'

export interface AuthenticatedUser {
  authId: string
  userId: string
  email: string
  fullName: string
  role: UserRole
  isActive: boolean
}

export interface AuthenticatedStaff extends AuthenticatedUser {
  role: 'staff'
  assignedMessId: MessId
}

export interface AuthenticatedAdmin extends AuthenticatedUser {
  role: 'admin'
}

// ─── Fetch user profile ───────────────────────────────────────────────────────

/**
 * Fetch full user profile from public.users by Supabase auth UID.
 * Uses service role client to bypass RLS.
 */
export async function getUserProfile(
  authId: string
): Promise<AuthenticatedUser | null> {
  const db = createAdminClient()

  const { data, error } = await db
    .from('users')
    .select('id, email, full_name, role, is_active')
    .eq('auth_id', authId)
    .single()

  if (error || !data || !data.is_active) return null

  return {
    authId,
    userId:   data.id,
    email:    data.email,
    fullName: data.full_name,
    role:     data.role,
    isActive: data.is_active,
  }
}

// ─── Role assertion helpers ───────────────────────────────────────────────────

/**
 * Assert the user is an admin.
 * Returns the admin profile or throws a 403 response.
 */
export async function requireAdmin(authId: string): Promise<AuthenticatedAdmin> {
  const user = await getUserProfile(authId)
  if (!user || user.role !== 'admin') {
    throw new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return user as AuthenticatedAdmin
}

/**
 * Assert the user is staff (or admin).
 * Returns the staff profile with their assigned mess.
 */
export async function requireStaff(authId: string): Promise<AuthenticatedStaff> {
  const user = await getUserProfile(authId)
  if (!user || !['staff', 'admin'].includes(user.role)) {
    throw new Response(JSON.stringify({ error: 'Forbidden: staff role required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Admins can act as staff for any mess
  if (user.role === 'admin') {
    return { ...user, role: 'staff', assignedMessId: 'mess_a' }
  }

  const db = createAdminClient()
  const { data: mapping } = await db
    .from('staff_mess_mapping')
    .select('mess_id, is_primary')
    .eq('user_id', user.userId)
    .order('is_primary', { ascending: false })
    .limit(1)
    .single()

  if (!mapping) {
    throw new Response(JSON.stringify({ error: 'Staff has no assigned mess' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return {
    ...user,
    role: 'staff',
    assignedMessId: mapping.mess_id,
  }
}

/**
 * Assert the user is an authenticated student.
 */
export async function requireStudent(authId: string): Promise<AuthenticatedUser & { studentId: string; rollNumber: string }> {
  const user = await getUserProfile(authId)
  if (!user || user.role !== 'student') {
    throw new Response(JSON.stringify({ error: 'Forbidden: student role required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const db = createAdminClient()
  const { data: student } = await db
    .from('students')
    .select('id, roll_number')
    .eq('user_id', user.userId)
    .single()

  if (!student) {
    throw new Response(JSON.stringify({ error: 'Student profile not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return { ...user, studentId: student.id, rollNumber: student.roll_number }
}

// ─── Utility: standard JSON error responses ───────────────────────────────────

export function unauthorized(message = 'Authentication required') {
  return Response.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Insufficient permissions') {
  return Response.json({ error: message }, { status: 403 })
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 })
}

export function serverError(message = 'Internal server error') {
  return Response.json({ error: message }, { status: 500 })
}
