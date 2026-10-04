// Passport details for the lease agreement. After staff mark a booking paid, the student
// enters their passport number and expiry on the portal's Profile page; staff verify (or
// reject with a reason) on the Bookings page; the agreement can then be generated.
import type { Payload } from 'payload'

import { activeBooking } from './bedHold'
import { warsawToday } from './studentAuth'

export type PassportStatus = 'none' | 'submitted' | 'verified' | 'rejected'

export const passportStatus = (student: any): PassportStatus =>
  (['submitted', 'verified', 'rejected'] as const).includes(student?.passportStatus) ? student.passportStatus : 'none'

/** "ab 123 4567" -> "AB1234567"; null unless 5–20 letters and digits. */
export function parsePassportNumber(input: unknown): string | null {
  const text = String(input ?? '').toUpperCase().replace(/[\s-]/g, '')
  return /^[A-Z0-9]{5,20}$/.test(text) ? text : null
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Passport expiry from the portal's date picker (YYYY-MM-DD): a real date after today
 * (Poland time), at most 15 years ahead. Stored as DD/MM/YYYY like the other dates.
 */
export function parsePassportExpiry(input: unknown, now: Date = new Date()): { ok: true; date: string } | { ok: false; message: string } {
  const m = String(input ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return { ok: false, message: 'Enter the date your passport is valid until.' }
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { ok: false, message: "That date doesn't exist." }
  }
  const [ty, tm, td] = warsawToday(now)
  if (date <= new Date(Date.UTC(ty, tm - 1, td))) return { ok: false, message: 'Your passport has expired. Please use a valid passport.' }
  if (date > new Date(Date.UTC(ty + 15, tm - 1, td))) return { ok: false, message: 'Please check the expiry date.' }
  return { ok: true, date: `${pad(day)}/${pad(month)}/${year}` }
}

/** Students may enter passport details once staff have marked their booking paid. */
export async function passportAllowed(payload: Payload, student: any) {
  const booking = await activeBooking(payload, student.whatsapp)
  return booking?.status === 'paid'
}
