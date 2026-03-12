// lib/meal/slots.ts
// Determines which meal slot is currently active based on
// the configured time windows in the meal_slots table.
// All time comparisons are in IST (UTC+5:30) by default.

import type { MealSlotRow, MealType, MessId } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveSlotResult {
  meal_type: MealType
  start_time: string    // "HH:MM"
  end_time: string      // "HH:MM"
  /** Minutes remaining in this slot */
  minutes_remaining: number
}

// ─── Time Utilities ───────────────────────────────────────────────────────────

/**
 * Convert a Date to "HH:MM" string in the configured timezone.
 * Defaults to Asia/Kolkata (IST) for Indian institutes.
 */
export function dateToTimeString(
  date: Date,
  timezone = process.env.APP_TIMEZONE || 'Asia/Kolkata'
): string {
  return date.toLocaleTimeString('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Convert a Date to "YYYY-MM-DD" string in the configured timezone.
 */
export function dateToDateString(
  date: Date,
  timezone = process.env.APP_TIMEZONE || 'Asia/Kolkata'
): string {
  return date.toLocaleDateString('en-CA', { timeZone: timezone })
}

/**
 * Compare two "HH:MM" time strings.
 * Returns: -1 if a < b, 0 if equal, 1 if a > b
 */
function compareTime(a: string, b: string): -1 | 0 | 1 {
  const [aH, aM] = a.split(':').map(Number)
  const [bH, bM] = b.split(':').map(Number)
  const aMin = aH * 60 + aM
  const bMin = bH * 60 + bM
  if (aMin < bMin) return -1
  if (aMin > bMin) return 1
  return 0
}

/**
 * Calculate minutes between two "HH:MM" strings.
 * Returns 0 if endTime <= startTime.
 */
function minutesBetween(startTime: string, endTime: string): number {
  const [sH, sM] = startTime.split(':').map(Number)
  const [eH, eM] = endTime.split(':').map(Number)
  return Math.max(0, (eH * 60 + eM) - (sH * 60 + sM))
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Determine which meal slot is currently active.
 *
 * @param slots - Active meal slots from DB (can be for any mess)
 * @param now   - Current time (defaults to now)
 * @returns The active slot, or null if outside all meal windows
 */
export function getCurrentMealSlot(
  slots: Pick<MealSlotRow, 'meal_type' | 'start_time' | 'end_time' | 'is_active'>[],
  now: Date = new Date()
): ActiveSlotResult | null {
  const currentTime = dateToTimeString(now)

  const activeSlots = slots.filter(s => s.is_active)

  for (const slot of activeSlots) {
    // DB stores time as "HH:MM:SS" — we only need "HH:MM"
    const start = slot.start_time.slice(0, 5)
    const end   = slot.end_time.slice(0, 5)

    if (
      compareTime(currentTime, start) >= 0 &&
      compareTime(currentTime, end)   <= 0
    ) {
      return {
        meal_type: slot.meal_type,
        start_time: start,
        end_time: end,
        minutes_remaining: minutesBetween(currentTime, end),
      }
    }
  }

  return null
}

/**
 * Get the next upcoming meal slot.
 * Useful for displaying "Next meal: Lunch at 12:00" to students.
 */
export function getNextMealSlot(
  slots: Pick<MealSlotRow, 'meal_type' | 'start_time' | 'end_time' | 'is_active'>[],
  now: Date = new Date()
): { meal_type: MealType; start_time: string; minutes_until: number } | null {
  const currentTime = dateToTimeString(now)

  const upcoming = slots
    .filter(s => s.is_active)
    .filter(s => compareTime(s.start_time.slice(0, 5), currentTime) > 0)
    .sort((a, b) => compareTime(a.start_time, b.start_time))

  const next = upcoming[0]
  if (!next) return null

  const start = next.start_time.slice(0, 5)
  return {
    meal_type: next.meal_type,
    start_time: start,
    minutes_until: minutesBetween(currentTime, start),
  }
}

/**
 * Format a meal type for display.
 */
export const MEAL_DISPLAY: Record<MealType, { label: string; emoji: string; color: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🍳', color: '#f59e0b' },
  lunch:     { label: 'Lunch',     emoji: '🍱', color: '#22c55e' },
  snacks:    { label: 'Snacks',    emoji: '🍪', color: '#a78bfa' },
  dinner:    { label: 'Dinner',    emoji: '🍽️',  color: '#3b82f6' },
}

export const MESS_DISPLAY: Record<MessId, { label: string; short: string; color: string }> = {
  mess_a: { label: 'Block A Mess', short: 'Block A', color: '#3b82f6' },
  mess_b: { label: 'Block B Mess', short: 'Block B', color: '#8b5cf6' },
}
