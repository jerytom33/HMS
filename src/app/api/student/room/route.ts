import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'
import { studentFromRequest } from '@/lib/studentAuth'
import { studentRoom } from '@/lib/studentRoom'

export const dynamic = 'force-dynamic'

/**
 * GET /api/student/room: the signed-in student's room and bed: the one staff assigned, or the
 * bed of their paid booking (with `room.booking`). `room` is null until then; `pending` is a
 * booking still waiting for payment confirmation.
 */
export async function GET(request: Request) {
  const payload = await botPayload()
  const student = await studentFromRequest(payload, request)
  if (!student) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })
  return NextResponse.json({ ok: true, status: student.status || '', ...(await studentRoom(payload, student)) })
}
