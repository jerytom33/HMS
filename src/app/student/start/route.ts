import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'
import { browseCookie, studentFromLink, verifyToken } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * GET /student/start?t=<token>: the personal link the WhatsApp bot sends after registration.
 * Opens a browse session (rooms for the student's gender, booking needs a WhatsApp code) and
 * goes to the room list. A forged or expired link goes to the login page with a note.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('t')
  const payload = await botPayload()
  const student = await studentFromLink(payload, token)
  const link = student && verifyToken(token, 'l')
  if (!student || !link) return NextResponse.redirect(new URL('/student/login?link=expired', url.origin))

  const response = NextResponse.redirect(new URL('/student/rooms', url.origin))
  response.cookies.set(browseCookie(String(student.id), link.wa, link.exp))
  return response
}
