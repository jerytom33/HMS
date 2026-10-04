import { NextResponse } from 'next/server'

import { holdBed, holdConfirmation } from '@/lib/bedHold'
import { allowedForGender, findUnit, genderNotAllowedMessage, parseAgreement } from '@/lib/botRooms'
import { botPayload, clean, loadInventory } from '@/lib/botServer'
import { parsePortalArrivalDate, studentFromRequest, studentGender } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/student/book   Body: { unit, bed, arrivalDate, minStayAgreed }
 * Holds the chosen bed for the signed-in student until payment, like the WhatsApp bot.
 * The room's gender setting is checked again here, so the rule can't be bypassed.
 */
export async function POST(request: Request) {
  const payload = await botPayload()
  const student = await studentFromRequest(payload, request)
  if (!student) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body required' }, { status: 400 })
  }
  const unitId = clean(body.unit)
  // Same arrival rule as the bot: after today (Poland time), at most 6 months ahead; stored as DD/MM/YYYY
  const arrival = parsePortalArrivalDate(body.arrivalDate)
  if (!arrival.ok) return NextResponse.json({ ok: false, reason: 'invalid_arrival_date', message: arrival.message }, { status: 400 })
  const bedText = clean(body.bed, 10)
  if (!unitId || !/^\d+$/.test(bedText)) {
    return NextResponse.json({ ok: false, reason: 'bad_request', message: 'Choose a room and a bed.' }, { status: 400 })
  }

  try {
    const { overrides, units } = await loadInventory(payload)
    // The portal sends unit ids, never titles
    const unit = findUnit(units, unitId).unit
    if (!unit || unit.unit !== unitId) {
      return NextResponse.json({ ok: false, reason: 'unit_not_found', message: 'Sorry, that room is no longer available. Please choose another one.' })
    }
    const gender = studentGender(student)
    if (!allowedForGender(unit.genderPolicy, gender)) {
      return NextResponse.json({ ok: false, reason: 'gender_not_allowed', message: genderNotAllowedMessage(unit.genderPolicy) }, { status: 403 })
    }

    const result = await holdBed(payload, {
      unit,
      overrides,
      bedText,
      wantedBed: Number(bedText),
      name: student.name || '',
      whatsapp: student.whatsapp,
      phone: String(student.phone || '').replace(/\D/g, '') || student.whatsapp,
      email: student.email || null,
      gender,
      minStayAgreed: parseAgreement(body.minStayAgreed),
      arrivalDate: arrival.date,
      source: 'portal',
    })
    if (!result.ok) return NextResponse.json(result)
    const { adminMessage, ...forStudent } = holdConfirmation(result.booking, result.duplicate)
    return NextResponse.json(forStudent)
  } catch (error) {
    console.error('Student booking API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again.' }, { status: 500 })
  }
}
