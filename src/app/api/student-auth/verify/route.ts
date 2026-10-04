import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'
import { BROWSE_COOKIE, checkLoginCode, normalizeWhatsapp, sessionCookie, signSession } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

const MESSAGES = {
  invalid_code: 'That code is not right. Check the latest code we sent you on WhatsApp.',
  expired_code: 'That code has expired or was already used. Tap "Send code" for a new one.',
  too_many_attempts: 'Too many wrong tries. Tap "Send code" for a new one.',
} as const

/**
 * POST /api/student-auth/verify   Body: { whatsapp, code }
 * Signs the student in with the one-time code sent to their WhatsApp (see /api/student-auth/request-code).
 */
export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body required' }, { status: 400 })
  }
  const whatsapp = normalizeWhatsapp(body.whatsapp)
  const code = String(body.code ?? '').replace(/\D/g, '')
  if (whatsapp.length < 8 || code.length !== 6) {
    return NextResponse.json({ ok: false, reason: 'bad_request', message: 'Enter your WhatsApp number and the 6-digit code.' }, { status: 400 })
  }

  const payload = await botPayload()
  const result = await checkLoginCode(payload, whatsapp, code)
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason, message: MESSAGES[result.reason] }, { status: 401 })

  const response = NextResponse.json({ ok: true, name: result.student.name || '' })
  response.cookies.set(sessionCookie(signSession(String(result.student.id), whatsapp)))
  response.cookies.delete(BROWSE_COOKIE)
  return response
}
