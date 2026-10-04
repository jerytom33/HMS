import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'
import { parsePassportExpiry, parsePassportNumber, passportAllowed, passportStatus } from '@/lib/passport'
import { studentFromRequest } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/student/passport   Body: { passportNumber, passportValidUntil (YYYY-MM-DD) }
 * The signed-in student's passport for the lease agreement. Allowed once staff have marked
 * their booking paid, until staff verify it; each change goes back to staff to verify.
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
    if (passportStatus(student) === 'verified') {
      return NextResponse.json({ ok: false, reason: 'verified', message: 'Your passport is already verified. To change it, please contact our team.' }, { status: 409 })
    }
    if (!(await passportAllowed(payload, student))) {
      return NextResponse.json({ ok: false, reason: 'not_yet', message: 'You can add your passport once your booking is paid.' }, { status: 409 })
    }
    const number = parsePassportNumber(body.passportNumber)
    if (!number) return NextResponse.json({ ok: false, reason: 'bad_number', message: 'Enter the passport number as printed (letters and digits).' }, { status: 400 })
    const expiry = parsePassportExpiry(body.passportValidUntil)
    if (!expiry.ok) return NextResponse.json({ ok: false, reason: 'bad_date', message: expiry.message }, { status: 400 })

    await payload.update({
      collection: 'v1-students',
      id: student.id,
      overrideAccess: true,
      data: { passportNumber: number, passportValidUntil: expiry.date, passportStatus: 'submitted', passportRejectReason: '' } as any,
    })
    return NextResponse.json({ ok: true, message: 'Thank you! Our team will check your passport details and then prepare your agreement.' })
  } catch (error) {
    console.error('Student passport API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again.' }, { status: 500 })
  }
}
