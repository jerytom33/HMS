import { NextResponse } from 'next/server'

import { holdBed, holdConfirmation } from '@/lib/bedHold'
import { allowedForGender, AMBIGUOUS_ROOM_MESSAGE, findUnit, genderNotAllowedMessage, parseAgreement, parseContactPhone, parseEmail, parseGender, parseSharing, resolveBed } from '@/lib/botRooms'
import { botPayload, checkBotKey, clean, loadInventory, normalizePhone } from '@/lib/botServer'
import { parseArrivalDate, saveStudentFromBot } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/bot/book   Header: x-api-key: <BOT_API_KEY>
 * Body: { unit, bed?, sharing?, hostel?, name, whatsapp, arrivalDate, phone?, email?, gender?, minStayAgreed? }
 * `minStayAgreed` is true (or "yes" / "I agree") when the student agreed to the minimum stay; bookings without it are still held.
 * `unit` is a room `value` from /api/bot/rooms or the room list title the student tapped
 * ("Room 402"; `sharing` and `hostel` tell rooms with the same name apart). `bed` is a bed
 * `value` or title from /api/bot/unit ("Bed B"); without it the first free bed is held. `phone` is the number to call; defaults to the WhatsApp number.
 * With `gender`, a male-only or female-only room is refused for the other gender (reason 'gender_not_allowed').
 * `arrivalDate` (DD/MM/YYYY), when given, must be after today (Poland time) and within 6 months,
 * else reason 'invalid_arrival_date' with a message naming the dates that work.
 *
 * Holds one free bed in the unit until payment (see holdBed) and saves the name, gender and
 * email to the student's record. Always answers 200 with `ok` for the bot to branch on.
 */
export async function POST(request: Request) {
  const denied = checkBotKey(request)
  if (denied) return denied

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_request', error: 'JSON body required' }, { status: 400 })
  }
  const unitId = clean(body.unit)
  const whatsapp = normalizePhone(body.whatsapp)
  const name = clean(body.name, 120)
  const arrivalText = clean(body.arrivalDate, 40)
  const arrival = arrivalText ? parseArrivalDate(arrivalText) : null
  const arrivalDate = arrival?.ok ? arrival.date : ''
  const phone = parseContactPhone(body.phone) || whatsapp
  const email = parseEmail(body.email)
  const gender = parseGender(body.gender)
  const minStayAgreed = parseAgreement(body.minStayAgreed)
  const bedText = clean(body.bed, 40)
  if (!unitId || !whatsapp) {
    return NextResponse.json({ ok: false, reason: 'bad_request', error: 'unit and whatsapp are required' }, { status: 400 })
  }

  if (arrival && !arrival.ok) {
    return NextResponse.json({ ok: false, reason: 'invalid_arrival_date', message: arrival.message })
  }

  try {
    const payload = await botPayload()
    const { overrides, units } = await loadInventory(payload)
    // `unit` and `bed` may be ids or the list titles the student tapped
    const found = findUnit(units, unitId, { sharing: parseSharing(body.sharing), hostel: body.hostel })
    if (found.ambiguous) {
      return NextResponse.json({ ok: false, reason: 'ambiguous_room', message: AMBIGUOUS_ROOM_MESSAGE })
    }
    const unit = found.unit
    if (!unit) {
      return NextResponse.json({ ok: false, reason: 'unit_not_found', message: 'Sorry, that room is no longer available. Please choose another one.' })
    }
    if (gender && !allowedForGender(unit.genderPolicy, gender)) {
      return NextResponse.json({ ok: false, reason: 'gender_not_allowed', message: genderNotAllowedMessage(unit.genderPolicy) })
    }

    // Keep the student record up to date with what the bot collected (gender drives the portal's room list)
    await saveStudentFromBot(payload, { whatsapp, name, gender, email, arrivalDate: arrivalDate || null }).catch((e) => console.error('Could not save student from bot booking:', e))

    const result = await holdBed(payload, {
      unit,
      overrides,
      bedText,
      wantedBed: bedText ? resolveBed(unit, bedText) : null,
      name,
      whatsapp,
      phone,
      email,
      gender,
      minStayAgreed,
      arrivalDate,
      source: 'bot',
    })
    if (!result.ok) return NextResponse.json(result)
    return NextResponse.json(holdConfirmation(result.booking, result.duplicate))
  } catch (error) {
    console.error('Bot booking API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again or tap "Request a call".' }, { status: 500 })
  }
}
