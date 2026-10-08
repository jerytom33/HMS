import { NextResponse } from 'next/server'

import { holdBed, holdConfirmation } from '@/lib/bedHold'
import { notifyAdminsOfBooking } from '@/lib/notify'
import { botPayload } from '@/lib/botServer'
import { checkPortalBooking } from '@/lib/portalBooking'
import { studentFromRequest, studentGender } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/student/book   Body: { unit, bed, arrivalDate, minStayAgreed }
 * Holds the chosen bed for the signed-in student until payment, like the WhatsApp bot.
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

  try {
    const check = await checkPortalBooking(payload, student, body)
    if (!check.ok) {
      const { status, ...refusal } = check
      return NextResponse.json(refusal, { status })
    }

    const result = await holdBed(payload, {
      unit: check.unit,
      overrides: check.overrides,
      bedText: String(check.bed),
      wantedBed: check.bed,
      name: student.name || '',
      whatsapp: student.whatsapp,
      phone: String(student.phone || '').replace(/\D/g, '') || student.whatsapp,
      email: student.email || null,
      gender: studentGender(student),
      minStayAgreed: check.minStayAgreed,
      arrivalDate: check.arrivalDate,
      source: 'portal',
    })
    if (!result.ok) return NextResponse.json(result)
    // A repeated request for the same hold (duplicate) was already announced
    if (!result.duplicate) await notifyAdminsOfBooking(result.booking)
    const { adminMessage, ...forStudent } = holdConfirmation(result.booking, result.duplicate)
    return NextResponse.json(forStudent)
  } catch (error) {
    console.error('Student booking API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again.' }, { status: 500 })
  }
}
