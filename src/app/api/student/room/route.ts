import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'
import { studentFromRequest } from '@/lib/studentAuth'
import { studentRoom } from '@/lib/studentRoom'

export const dynamic = 'force-dynamic'

/** GET /api/student/room: the room and bed staff assigned to the signed-in student (`room: null` when none yet). */
export async function GET(request: Request) {
  const payload = await botPayload()
  const student = await studentFromRequest(payload, request)
  if (!student) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })
  return NextResponse.json({ ok: true, status: student.status || '', room: await studentRoom(payload, student) })
}
