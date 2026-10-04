import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'
import { clientIp, requestCode } from '@/lib/otp'
import { checkPortalBooking } from '@/lib/portalBooking'
import { browsingStudent } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/student/book/request-code   Body: { unit, bed, arrivalDate, minStayAgreed }
 * Step 1 of holding a bed from a browse session: checks the booking, then sends a one-time
 * code to the student's WhatsApp (rate-limited). Step 2 is /api/student/book with the code.
 */
export async function POST(request: Request) {
  const payload = await botPayload()
  const who = await browsingStudent(payload, request)
  if (!who) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })
  if (who.verified) return NextResponse.json({ ok: true, codeRequired: false })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body required' }, { status: 400 })
  }
  try {
    const check = await checkPortalBooking(payload, who.student, body)
    if (!check.ok) return NextResponse.json({ ok: false, reason: check.reason, message: check.message }, { status: check.status })

    const sent = await requestCode(payload, { whatsapp: who.student.whatsapp, ip: clientIp(request) })
    if (!sent.ok) return NextResponse.json(sent, { status: 429 })
    const last4 = String(who.student.whatsapp).slice(-4)
    return NextResponse.json({ ok: true, codeRequired: true, message: `We've sent a 6-digit code to your WhatsApp (number ending ${last4}). It works once, for 10 minutes.` })
  } catch (error) {
    console.error('Booking code API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again.' }, { status: 500 })
  }
}
