import { NextResponse } from 'next/server'

import { cancelOwnBooking } from '@/lib/bedHold'
import { botPayload, clean } from '@/lib/botServer'
import { studentFromRequest } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/student/bookings/cancel   Body: { ref }
 * Cancels the signed-in student's booking that is on hold, freeing the bed so they can book
 * another (one booking per student). Paid bookings can't be cancelled here.
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
  const ref = clean(body.ref, 20)
  if (!ref) return NextResponse.json({ ok: false, reason: 'bad_request', message: 'Which booking should be cancelled?' }, { status: 400 })

  try {
    const result = await cancelOwnBooking(payload, student.whatsapp, ref, 'portal')
    return NextResponse.json(result, { status: result.ok ? 200 : result.reason === 'not_found' ? 404 : 409 })
  } catch (error) {
    console.error('Student cancel API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again.' }, { status: 500 })
  }
}
