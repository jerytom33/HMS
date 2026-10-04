import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'
import { normalizeWhatsapp, passwordProblem, sessionCookie, setStudentPassword, signSession, studentFromLink } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/student-auth/set-password   Body: { token, password }
 * Sets (or resets) the student's password from their personal link and signs them in.
 * A link works for one password: setting it ends that link, older links and other sessions.
 */
export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body required' }, { status: 400 })
  }
  const problem = passwordProblem(body.password)
  if (problem) return NextResponse.json({ ok: false, reason: 'weak_password', message: problem }, { status: 400 })

  try {
    const payload = await botPayload()
    const student = await studentFromLink(payload, typeof body.token === 'string' ? body.token : '')
    if (!student) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_link', message: 'This link has expired or was already used. Message our WhatsApp assistant for a new link.' },
        { status: 401 },
      )
    }
    const pv = await setStudentPassword(payload, student, body.password)
    const response = NextResponse.json({ ok: true, name: student.name || '' })
    response.cookies.set(sessionCookie(signSession(String(student.id), normalizeWhatsapp(student.whatsapp), pv)))
    return response
  } catch (error) {
    console.error('Set password API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again.' }, { status: 500 })
  }
}
