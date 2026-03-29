// types/api.ts
// Shared request/response types for all API routes

import type { DenialReason, MealType, MessId, AuthorizationMethod } from './database'

// ─── QR Token ────────────────────────────────────────────────────────────────

export interface QRTokenPayload {
  /** Unique nonce — primary replay attack prevention */
  jti: string
  /** Which mess this token is valid for */
  mess_id: MessId
  /** Unix timestamp: issued at */
  iat: number
  /** Unix timestamp: expires at */
  exp: number
  /** Identifies the kiosk device session */
  kiosk_session: string
}

export interface GenerateQRResponse {
  token: string
  mess_id: MessId
  expires_at: string      // ISO string
  ttl_seconds: number
  refresh_interval_secs: number
}

// ─── Authorization ────────────────────────────────────────────────────────────

export interface ScanAuthRequest {
  qr_token: string
}

export interface ManualAuthRequest {
  roll_number: string
}

export interface MealAuthSuccessData {
  student_name: string
  roll_number: string
  mess_name: string
  meal_type: MealType
  authorized_at: string        // ISO string
  subscription_valid_until: string
  method: AuthorizationMethod
  is_grace_period?: boolean
  grace_type?: 'early' | 'late'
}

export interface AuthSuccessResponse {
  success: true
  data: MealAuthSuccessData
}

export interface AuthDeniedResponse {
  success: false
  reason: DenialReason
  message: string
}

export type AuthResponse = AuthSuccessResponse | AuthDeniedResponse

// ─── Student ─────────────────────────────────────────────────────────────────

export interface StudentProfile {
  id: string
  user_id: string
  roll_number: string
  full_name: string
  email: string
  hostel_block: string | null
  room_number: string | null
  phone: string | null
  batch_year: number | null
  department: string | null
  is_blocked: boolean
  block_reason: string | null
  avatar_url: string | null
}

export interface StudentWithSubscription extends StudentProfile {
  subscription: {
    id: string
    mess_id: MessId
    mess_name: string
    start_date: string
    end_date: string
    status: string
  } | null
}

// ─── Meal History ─────────────────────────────────────────────────────────────

export interface MealHistoryEntry {
  id: string
  meal_date: string
  meal_type: MealType
  mess_id: MessId
  mess_name: string
  method: AuthorizationMethod
  authorized_at: string
}

// ─── Staff Summary ────────────────────────────────────────────────────────────

export interface TodaySummary {
  mess_id: MessId
  mess_name: string
  date: string
  totals: {
    breakfast: number
    lunch: number
    snacks: number
    dinner: number
    total: number
  }
  qr_scans: number
  manual_entries: number
  denied_attempts: number
}

// ─── Generic API wrappers ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    code?: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}
