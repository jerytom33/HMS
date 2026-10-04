// Checks before the portal holds a bed: one booking per student, a valid arrival date,
// a room the student's gender may stay in and a bed that is still free.
import type { Payload } from 'payload'

import { activeBooking, alreadyBookedResult } from './bedHold'
import { allowedForGender, findUnit, genderNotAllowedMessage, parseAgreement } from './botRooms'
import { clean, loadInventory } from './botServer'
import { parsePortalArrivalDate, studentGender } from './studentAuth'

export type BookingCheck =
  | { ok: true; unit: ReturnType<typeof findUnit>['unit'] & {}; overrides: Awaited<ReturnType<typeof loadInventory>>['overrides']; bed: number; arrivalDate: string; minStayAgreed: boolean }
  | { ok: false; status: number; reason: string; message: string; bookingRef?: string; canCancel?: boolean }

/** Body { unit, bed, arrivalDate, minStayAgreed } checked against the inventory and the student's gender. */
export async function checkPortalBooking(payload: Payload, student: any, body: any): Promise<BookingCheck> {
  const unitId = clean(body?.unit)
  const bedText = clean(body?.bed, 10)
  // Same arrival rule as the bot: after today (Poland time), at most 6 months ahead; stored as DD/MM/YYYY
  const arrival = parsePortalArrivalDate(body?.arrivalDate)
  if (!arrival.ok) return { ok: false, status: 400, reason: 'invalid_arrival_date', message: arrival.message }
  if (!unitId || !/^\d+$/.test(bedText)) return { ok: false, status: 400, reason: 'bad_request', message: 'Choose a room and a bed.' }

  // One booking per student; checked first so a double tap names the booking just made
  const current = await activeBooking(payload, student.whatsapp)
  if (current) {
    const { ok, ...refusal } = alreadyBookedResult(current)
    return { ok, status: 409, ...refusal }
  }

  const { overrides, units } = await loadInventory(payload)
  // The portal sends unit ids, never titles
  const unit = findUnit(units, unitId).unit
  if (!unit || unit.unit !== unitId) {
    return { ok: false, status: 200, reason: 'unit_not_found', message: 'Sorry, that room is no longer available. Please choose another one.' }
  }
  // The room's gender setting is checked here too, so the portal's filter can't be bypassed
  if (!allowedForGender(unit.genderPolicy, studentGender(student))) {
    return { ok: false, status: 403, reason: 'gender_not_allowed', message: genderNotAllowedMessage(unit.genderPolicy) }
  }
  const bed = Number(bedText)
  if (!unit.freeBedIndices.includes(bed)) {
    return { ok: false, status: 200, reason: 'bed_taken', message: 'Sorry, that bed was just booked by someone else 😔 Please choose another bed.' }
  }
  return { ok: true, unit, overrides, bed, arrivalDate: arrival.date, minStayAgreed: parseAgreement(body?.minStayAgreed) }
}
