// types/database.ts
// Auto-generated from schema — keep in sync with migrations
// Run: npx supabase gen types typescript --project-id YOUR_ID > types/database.ts

export type UserRole = 'student' | 'staff' | 'admin'
export type MessId = 'mess_a' | 'mess_b'
export type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner'
export type SubscriptionStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'expired'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type AuthorizationMethod = 'qr_scan' | 'manual_staff' | 'admin_override'
export type AuditAction =
  | 'manual_verification'
  | 'admin_override'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_deactivated'
  | 'student_blocked'
  | 'student_unblocked'
  | 'qr_config_changed'
  | 'meal_slot_changed'
  | 'temp_permission_granted'
  | 'temp_permission_revoked'
  | 'mess_change_approved'
  | 'mess_change_rejected'
  | 'staff_assigned'
  | 'staff_removed'

export type DenialReason =
  | 'wrong_mess'
  | 'already_consumed'
  | 'outside_meal_hours'
  | 'inactive_subscription'
  | 'expired_qr'
  | 'invalid_qr'
  | 'invalid_token'
  | 'blocked_student'
  | 'no_subscription'
  | 'qr_already_used'
  | 'student_not_found'

// ─── Table Row Types ──────────────────────────────────────────────────────────

export interface UserRow {
  id: string
  auth_id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StudentRow {
  id: string
  user_id: string
  roll_number: string
  hostel_block: string | null
  room_number: string | null
  phone: string | null
  batch_year: number | null
  department: string | null
  is_blocked: boolean
  block_reason: string | null
  blocked_at: string | null
  blocked_by: string | null
  created_at: string
  updated_at: string
}

export interface MessRow {
  id: MessId
  name: string
  location: string | null
  vendor_name: string | null
  vendor_contact: string | null
  is_active: boolean
  created_at: string
}

export interface StaffMessMappingRow {
  id: string
  user_id: string
  mess_id: MessId
  is_primary: boolean
  assigned_at: string
}

export interface SubscriptionRow {
  id: string
  student_id: string
  mess_id: MessId
  status: SubscriptionStatus
  start_date: string
  end_date: string
  plan_name: string | null
  monthly_fee: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MealSlotRow {
  id: string
  mess_id: MessId
  meal_type: MealType
  start_time: string   // "HH:MM:SS"
  end_time: string
  is_active: boolean
  updated_by: string | null
  updated_at: string
}

export interface QRSessionRow {
  id: string            // UUID — also the jti nonce
  mess_id: MessId
  token_hash: string
  kiosk_session: string
  issued_at: string
  expires_at: string
  is_used: boolean
  used_at: string | null
  used_by: string | null
}

export interface QRConfigRow {
  id: string
  mess_id: MessId
  token_ttl_secs: number
  refresh_interval_secs: number
  is_enabled: boolean
  updated_by: string | null
  updated_at: string
}

export interface MealLogRow {
  id: string
  student_id: string
  mess_id: MessId
  meal_type: MealType
  meal_date: string
  authorized_at: string
  method: AuthorizationMethod
  qr_session_id: string | null
  authorized_by: string | null
  subscription_id: string | null
}

export interface AuthorizationAttemptRow {
  id: string
  student_id: string | null
  roll_number: string | null
  mess_id: MessId
  qr_session_id: string | null
  method: AuthorizationMethod
  was_successful: boolean
  denial_reason: DenialReason | null
  meal_type: MealType | null
  ip_address: string | null
  user_agent: string | null
  attempted_at: string
}

export interface MessChangeRequestRow {
  id: string
  student_id: string
  from_mess_id: MessId
  to_mess_id: MessId
  reason: string | null
  status: RequestStatus
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  effective_date: string | null
}

export interface TemporaryPermissionRow {
  id: string
  student_id: string
  mess_id: MessId
  meal_type: MealType | null
  valid_from: string
  valid_until: string
  reason: string
  granted_by: string
  is_active: boolean
  created_at: string
}

export interface AuditLogRow {
  id: string
  actor_id: string
  action: AuditAction
  target_type: string | null
  target_id: string | null
  before_state: Record<string, unknown> | null
  after_state: Record<string, unknown> | null
  notes: string | null
  ip_address: string | null
  created_at: string
}

// ─── View Types ───────────────────────────────────────────────────────────────

export interface DailyMealSummaryRow {
  meal_date: string
  mess_id: MessId
  mess_name: string
  meal_type: MealType
  total_meals: number
  qr_scans: number
  manual_entries: number
}

export interface TodayAuthorizationRow {
  id: string
  attempted_at: string
  mess_id: MessId
  meal_type: MealType | null
  method: AuthorizationMethod
  was_successful: boolean
  denial_reason: DenialReason | null
  roll_number: string | null
  student_name: string | null
}

export interface StudentSubscriptionStatusRow {
  student_id: string
  roll_number: string
  full_name: string
  email: string
  subscribed_mess: MessId | null
  mess_name: string | null
  start_date: string | null
  end_date: string | null
  subscription_status: SubscriptionStatus | null
  is_blocked: boolean
  block_reason: string | null
}

// ─── Supabase Database Type Map ───────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      users:                   { Row: UserRow;                   Insert: Partial<UserRow>;                   Update: Partial<UserRow> }
      students:                { Row: StudentRow;                Insert: Partial<StudentRow>;                Update: Partial<StudentRow> }
      messes:                  { Row: MessRow;                   Insert: Partial<MessRow>;                   Update: Partial<MessRow> }
      staff_mess_mapping:      { Row: StaffMessMappingRow;       Insert: Partial<StaffMessMappingRow>;       Update: Partial<StaffMessMappingRow> }
      subscriptions:           { Row: SubscriptionRow;           Insert: Partial<SubscriptionRow>;           Update: Partial<SubscriptionRow> }
      meal_slots:              { Row: MealSlotRow;               Insert: Partial<MealSlotRow>;               Update: Partial<MealSlotRow> }
      qr_sessions:             { Row: QRSessionRow;              Insert: Partial<QRSessionRow>;              Update: Partial<QRSessionRow> }
      qr_config:               { Row: QRConfigRow;               Insert: Partial<QRConfigRow>;               Update: Partial<QRConfigRow> }
      meal_logs:               { Row: MealLogRow;                Insert: Partial<MealLogRow>;                Update: Partial<MealLogRow> }
      authorization_attempts:  { Row: AuthorizationAttemptRow;   Insert: Partial<AuthorizationAttemptRow>;   Update: Partial<AuthorizationAttemptRow> }
      mess_change_requests:    { Row: MessChangeRequestRow;      Insert: Partial<MessChangeRequestRow>;      Update: Partial<MessChangeRequestRow> }
      temporary_permissions:   { Row: TemporaryPermissionRow;    Insert: Partial<TemporaryPermissionRow>;    Update: Partial<TemporaryPermissionRow> }
      audit_logs:              { Row: AuditLogRow;               Insert: Partial<AuditLogRow>;               Update: Partial<AuditLogRow> }
    }
    Views: {
      v_daily_meal_summary:           { Row: DailyMealSummaryRow }
      v_today_authorizations:         { Row: TodayAuthorizationRow }
      v_student_subscription_status:  { Row: StudentSubscriptionStatusRow }
    }
    Functions: {
      fn_expire_subscriptions:  { Args: Record<never, never>; Returns: void }
      fn_cleanup_qr_sessions:   { Args: Record<never, never>; Returns: void }
      fn_current_user_role:     { Args: Record<never, never>; Returns: UserRole }
      fn_current_user_id:       { Args: Record<never, never>; Returns: string }
      fn_current_student_id:    { Args: Record<never, never>; Returns: string }
      fn_block_student:         { Args: { p_student_id: string; p_reason: string; p_blocked_by: string }; Returns: void }
    }
    Enums: {
      user_role:               UserRole
      mess_id_enum:            MessId
      meal_type_enum:          MealType
      subscription_status_enum: SubscriptionStatus
      request_status_enum:     RequestStatus
      denial_reason_enum:      DenialReason
      authorization_method_enum: AuthorizationMethod
      audit_action_enum:       AuditAction
    }
  }
}
