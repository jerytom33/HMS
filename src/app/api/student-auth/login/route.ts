import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'
import { clearLoginFailures, clientIp, loginWait, recordLoginFailure, REGISTER_URL, waitMessage } from '@/lib/loginLimits'
import { checkStudentPassword, normalizeWhatsapp, passwordVersion, sessionCookie, signSession } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/** Same answer for an unknown number, a number without a password and a wrong password. */
const WRONG = "Wrong number or password. No password yet, or forgot it? Message our WhatsApp assistant for your personal link."

/**
 * POST /api/student-auth/login   Body: { whatsapp, password }
 * Signs the student in with the password they set from their personal link.
 * Wrong tries are limited per number and per IP (429 with the wait).
 */
export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body required' }, { status: 400 })
  }
  const whatsapp = normalizeWhatsapp(body.whatsapp)
  const password = typeof body.password === 'string' ? body.password.slice(0, 256) : ''
  if (whatsapp.length < 8 || whatsapp.length > 15 || !password) {
    return NextResponse.json({ ok: false, reason: 'bad_request', message: 'Enter your WhatsApp number (with the country code) and your password.' }, { status: 400 })
  }

  try {
    const payload = await botPayload()
    const ip = clientIp(request)
    const wait = await loginWait(payload, whatsapp, ip)
    if (wait > 0) return NextResponse.json({ ok: false, reason: 'rate_limited', retryAfterSeconds: wait, message: waitMessage(wait) }, { status: 429 })

    const student = await checkStudentPassword(payload, whatsapp, password)
    if (!student) {
      await recordLoginFailure(payload, whatsapp, ip)
      return NextResponse.json({ ok: false, reason: 'wrong_login', message: WRONG, registerUrl: REGISTER_URL }, { status: 401 })
    }
    await clearLoginFailures(payload, whatsapp)
    const response = NextResponse.json({ ok: true, name: student.name || '' })
    response.cookies.set(sessionCookie(signSession(String(student.id), normalizeWhatsapp(student.whatsapp), passwordVersion(student))))
    return response
  } catch (error) {
    console.error('Student login API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again.' }, { status: 500 })
  }
}
