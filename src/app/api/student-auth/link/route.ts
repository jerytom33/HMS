import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'
import { passwordVersion, studentFromLink } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/student-auth/link?t=<token>: whether a personal link still works, for the
 * set-password page. Gives only the first name and whether a password exists already.
 */
export async function GET(request: Request) {
  const payload = await botPayload()
  const student = await studentFromLink(payload, new URL(request.url).searchParams.get('t'))
  if (!student) return NextResponse.json({ ok: false, reason: 'invalid_link' }, { status: 401 })
  return NextResponse.json({
    ok: true,
    firstName: String(student.name || '').trim().split(/\s+/)[0] || '',
    hasPassword: passwordVersion(student) > 0,
  })
}
