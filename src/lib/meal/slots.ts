// lib/meal/slots.ts
// Determines which meal slot is currently active based on
// the configured time windows in the meal_slots table.
// All time comparisons are in IST (UTC+5:30) by default.
//
// Supports:
//   - Weekday (Mon–Fri) vs Weekend (Sat–Sun) timings
//   - Institute holidays (treated as weekend timings)
//   - 15-minute grace period before AND after each slot
//   - Late entry: student is inside grace window → authorized with warning

import type { MealSlotRow, MealType, MessId } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveSlotResult {
  meal_type: MealType
  start_time: string          // "HH:MM" — actual slot start (no grace)
  end_time: string            // "HH:MM" — actual slot end (no grace)
  minutes_remaining: number
  /** true = inside grace window (before open or after close) */
  is_grace_period: boolean
  /** 'early' = grace before slot, 'late' = grace after slot */
  grace_type?: 'early' | 'late'
}

// ─── Grace period ─────────────────────────────────────────────────────────────

const GRACE_MINUTES = 15

// ─── Weekday / Weekend slot config ────────────────────────────────────────────
// These are the canonical timings. The DB rows are used as overrides if present
// but the day-type logic lives here so it works even without separate DB rows.

export interface SlotConfig {
  meal_type: MealType
  start_time: string   // "HH:MM"
  end_time: string     // "HH:MM"
}

export const WEEKDAY_SLOTS: SlotConfig[] = [
  { meal_type: 'breakfast', start_time: '07:30', end_time: '09:00' },
  { meal_type: 'lunch',     start_time: '12:15', end_time: '14:00' },
  { meal_type: 'snacks',    start_time: '17:00', end_time: '18:00' },
  { meal_type: 'dinner',    start_time: '19:30', end_time: '21:00' },
]

export const WEEKEND_SLOTS: SlotConfig[] = [
  { meal_type: 'breakfast', start_time: '07:30', end_time: '09:30' },
  { meal_type: 'lunch',     start_time: '12:15', end_time: '14:30' },
  { meal_type: 'snacks',    start_time: '17:00', end_time: '18:00' },
  { meal_type: 'dinner',    start_time: '19:30', end_time: '21:30' },
]

// ─── Time Utilities ───────────────────────────────────────────────────────────

/**
 * Convert a Date to "HH:MM" string in the configured timezone.
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
 * Returns the day of week (0=Sun, 1=Mon … 6=Sat) in IST.
 */
function getDayOfWeekIST(date: Date): number {
  const ist = new Date(date.toLocaleString('en-US', { timeZone: process.env.APP_TIMEZONE || 'Asia/Kolkata' }))
  return ist.getDay()
}

/**
 * Returns true if the date is a weekend (Sat or Sun) in IST.
 */
export function isWeekend(date: Date): boolean {
  const dow = getDayOfWeekIST(date)
  return dow === 0 || dow === 6
}

/**
 * Get the canonical slot config for the given date (weekday vs weekend).
 * DB rows are used to override timings if provided; otherwise falls back
 * to the hardcoded WEEKDAY_SLOTS / WEEKEND_SLOTS above.
 */
export function getSlotsForDay(
  dbSlots: Pick<MealSlotRow, 'meal_type' | 'start_time' | 'end_time' | 'is_active'>[],
  date: Date,
  isHoliday = false
): SlotConfig[] {
  const useWeekend = isWeekend(date) || isHoliday
  const base = useWeekend ? WEEKEND_SLOTS : WEEKDAY_SLOTS

  // If DB has slots, use their timings for each meal_type (they override base)
  if (dbSlots.length > 0) {
    return base.map(slot => {
      const dbRow = dbSlots.find(r => r.meal_type === slot.meal_type && r.is_active)
      if (!dbRow) return slot
      return {
        meal_type: slot.meal_type,
        start_time: dbRow.start_time.slice(0, 5),
        end_time: dbRow.end_time.slice(0, 5),
      }
    })
  }

  return base
}

/**
 * Compare two "HH:MM" time strings.
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
 * Add (or subtract) minutes from a "HH:MM" string.
 */
function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = Math.max(0, Math.min(1439, h * 60 + m + mins))
  const hh = String(Math.floor(total / 60)).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * Calculate minutes between two "HH:MM" strings.
 */
function minutesBetween(startTime: string, endTime: string): number {
  const [sH, sM] = startTime.split(':').map(Number)
  const [eH, eM] = endTime.split(':').map(Number)
  return Math.max(0, (eH * 60 + eM) - (sH * 60 + sM))
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Determine which meal slot is currently active (including grace periods).
 *
 * Grace window = [start - 15min, end + 15min]
 * Within grace: is_grace_period = true
 * Within actual slot: is_grace_period = false
 *
 * @param slots     - Active meal slots from DB
 * @param now       - Current time
 * @param isHoliday - Pass true on institute holidays (uses weekend timings)
 */
export function getCurrentMealSlot(
  slots: Pick<MealSlotRow, 'meal_type' | 'start_time' | 'end_time' | 'is_active'>[],
  now: Date = new Date(),
  isHoliday = false
): ActiveSlotResult | null {
  const currentTime = dateToTimeString(now)
  const daySlots = getSlotsForDay(slots, now, isHoliday)

  for (const slot of daySlots) {
    const start      = slot.start_time
    const end        = slot.end_time
    const graceStart = addMinutes(start, -GRACE_MINUTES)
    const graceEnd   = addMinutes(end, GRACE_MINUTES)

    const inGraceWindow = (
      compareTime(currentTime, graceStart) >= 0 &&
      compareTime(currentTime, graceEnd)   <= 0
    )

    if (!inGraceWindow) continue

    const inActualSlot = (
      compareTime(currentTime, start) >= 0 &&
      compareTime(currentTime, end)   <= 0
    )

    const isGrace = !inActualSlot
    const graceType: 'early' | 'late' | undefined = isGrace
      ? (compareTime(currentTime, start) < 0 ? 'early' : 'late')
      : undefined

    return {
      meal_type: slot.meal_type,
      start_time: start,
      end_time: end,
      minutes_remaining: minutesBetween(currentTime, graceEnd),
      is_grace_period: isGrace,
      grace_type: graceType,
    }
  }

  return null
}

/**
 * Get the next upcoming meal slot (including grace start).
 */
export function getNextMealSlot(
  slots: Pick<MealSlotRow, 'meal_type' | 'start_time' | 'end_time' | 'is_active'>[],
  now: Date = new Date(),
  isHoliday = false
): { meal_type: MealType; start_time: string; minutes_until: number } | null {
  const currentTime = dateToTimeString(now)
  const daySlots = getSlotsForDay(slots, now, isHoliday)

  const upcoming = daySlots
    .filter(s => compareTime(s.start_time, currentTime) > 0)
    .sort((a, b) => compareTime(a.start_time, b.start_time))

  const next = upcoming[0]
  if (!next) return null

  return {
    meal_type: next.meal_type,
    start_time: next.start_time,
    minutes_until: minutesBetween(currentTime, next.start_time),
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