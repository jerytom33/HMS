import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'
import { clientIp, NEUTRAL_MESSAGE, REGISTER_URL, requestCode } from '@/lib/otp'
import { normalizeWhatsapp } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/student-auth/request-code   Body: { whatsapp }
 * Sends a login code to the number's WhatsApp when a student has it. The answer is the same
 * whether or not the number is registered; only the rate limit (429) can differ, and it
 * applies to every number alike.
 */
export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body required' }, { status: 400 })
  }
  const whatsapp = normalizeWhatsapp(body.whatsapp)
  if (whatsapp.length < 8 || whatsapp.length > 15) {
    return NextResponse.json({ ok: false, reason: 'bad_request', message: 'Enter your WhatsApp number with the country code, e.g. +48 500 100 200.' }, { status: 400 })
  }
  try {
    const payload = await botPayload()
    const result = await requestCode(payload, { whatsapp, ip: clientIp(request) })
    if (!result.ok) return NextResponse.json(result, { status: 429 })
    return NextResponse.json({ ok: true, message: NEUTRAL_MESSAGE, registerUrl: REGISTER_URL })
  } catch (error) {
    console.error('Login code API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again.' }, { status: 500 })
  }
}
