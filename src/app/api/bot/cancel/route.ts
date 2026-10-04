import { NextResponse } from 'next/server'

import { cancelOwnBooking } from '@/lib/bedHold'
import { botPayload, checkBotKey, clean } from '@/lib/botServer'
import { normalizeWhatsapp } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/bot/cancel   Header: x-api-key: <BOT_API_KEY>
 * Body: { whatsapp, ref? }
 *
 * Cancels the student's booking that is on hold (the one with `ref`, or their current one),
 * so they can book a different bed: a student may have only one booking. Paid bookings are
 * refused (reason 'not_cancellable'); staff handle those. Always answers 200 with `ok` and a
 * `message` for the student.
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
  const whatsapp = normalizeWhatsapp(body.whatsapp)
  if (whatsapp.length < 8) return NextResponse.json({ ok: false, reason: 'bad_request', error: 'whatsapp is required' }, { status: 400 })

  try {
    const payload = await botPayload()
    return NextResponse.json(await cancelOwnBooking(payload, whatsapp, clean(body.ref, 20) || null, 'bot'))
  } catch (error) {
    console.error('Bot cancel API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again.' }, { status: 500 })
  }
}
