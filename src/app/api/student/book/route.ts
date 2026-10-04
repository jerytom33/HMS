import { NextResponse } from 'next/server'

import { holdBed, holdConfirmation } from '@/lib/bedHold'
import { botPayload } from '@/lib/botServer'
import { checkPortalBooking } from '@/lib/portalBooking'
import { BROWSE_COOKIE, browsingStudent, checkLoginCode, sessionCookie, signSession, studentGender } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

const CODE_MESSAGES = {
  invalid_code: 'That code is not right. Check the latest code we sent you on WhatsApp.',
  expired_code: 'That code has expired or was already used. Tap "Send code" for a new one.',
  too_many_attempts: 'Too many wrong tries. Tap "Send code" for a new one.',
} as const

/**
 * POST /api/student/book   Body: { unit, bed, arrivalDate, minStayAgreed, code? }
 * Holds the chosen bed until payment, like the WhatsApp bot.
 *
 * From a browse session (the bot's personal link) `code` is required: the one-time code from
 * /api/student/book/request-code. A correct code marks the number verified and starts the full
 * portal session, even when the bed was taken in the meantime. A signed-in student (who already
 * verified the number at login) needs no code.
 */
export async function POST(request: Request) {
  const payload = await botPayload()
  const who = await browsingStudent(payload, request)
  if (!who) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })
  const { student } = who

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body required' }, { status: 400 })
  }

  try {
    // The code is checked first, so a correct code signs the student in even if the bed is gone
    let startSession = false
    if (!who.verified) {
      const code = String(body.code ?? '').replace(/\D/g, '')
      if (code.length !== 6) {
        return NextResponse.json({ ok: false, reason: 'code_required', message: 'Enter the 6-digit code we sent to your WhatsApp.' }, { status: 401 })
      }
      const verified = await checkLoginCode(payload, student.whatsapp, code)
      if (!verified.ok) return NextResponse.json({ ok: false, reason: verified.reason, message: CODE_MESSAGES[verified.reason] }, { status: 401 })
      startSession = true
    }
    const withSession = (response: NextResponse) => {
      if (startSession) {
        response.cookies.set(sessionCookie(signSession(String(student.id), student.whatsapp)))
        response.cookies.delete(BROWSE_COOKIE)
      }
      return response
    }

    const check = await checkPortalBooking(payload, student, body)
    if (!check.ok) {
      return withSession(NextResponse.json({ ok: false, reason: check.reason, message: check.message, signedIn: startSession }, { status: check.status }))
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
    if (!result.ok) return withSession(NextResponse.json({ ...result, signedIn: startSession }))
    const { adminMessage, ...forStudent } = holdConfirmation(result.booking, result.duplicate)
    return withSession(NextResponse.json({ ...forStudent, signedIn: startSession }))
  } catch (error) {
    console.error('Student booking API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again.' }, { status: 500 })
  }
}
