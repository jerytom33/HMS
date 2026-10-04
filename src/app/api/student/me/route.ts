import { NextResponse } from 'next/server'

import { GENDER_LABELS } from '@/lib/botRooms'
import { botPayload } from '@/lib/botServer'
import { studentFromRequest, studentGender } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/** GET /api/student/me: the signed-in student's profile. */
export async function GET(request: Request) {
  const payload = await botPayload()
  const student = await studentFromRequest(payload, request)
  if (!student) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })
  const gender = studentGender(student)
  return NextResponse.json({
    ok: true,
    name: student.name || '',
    whatsapp: student.whatsapp,
    email: student.email || '',
    gender: gender ? GENDER_LABELS[gender] : '',
  })
}
