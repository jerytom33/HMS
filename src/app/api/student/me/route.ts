import { NextResponse } from 'next/server'

import { GENDER_LABELS, parseEmail } from '@/lib/botRooms'
import { botPayload, clean } from '@/lib/botServer'
import { arrivalRange, dmyToIso, parseArrivalDate, studentFromRequest, studentGender } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

const profile = (student: any) => {
  const gender = studentGender(student)
  return {
    ok: true,
    name: student.name || '',
    whatsapp: student.whatsapp,
    email: student.email || '',
    gender: gender ? GENDER_LABELS[gender] : '',
    course: student.course || '',
    yearOfStudy: student.yearOfStudy || '',
    // As saved (DD/MM/YYYY), for display
    arrivalDateText: student.arrivalDate || '',
    // Saved arrival (DD/MM/YYYY) as YYYY-MM-DD for the date picker, only while it is still allowed
    arrivalDate: parseArrivalDate(student.arrivalDate).ok ? dmyToIso(student.arrivalDate) : '',
    arrivalRange: arrivalRange(),
  }
}

/** GET /api/student/me: the signed-in student's profile. */
export async function GET(request: Request) {
  const payload = await botPayload()
  const student = await studentFromRequest(payload, request)
  if (!student) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })
  return NextResponse.json(profile(student))
}

/**
 * PATCH /api/student/me  Body: { email?, course?, yearOfStudy? }
 * Students may change only these; name, gender and WhatsApp come from the bot and staff.
 * An empty email clears it; anything else must be a valid address.
 */
export async function PATCH(request: Request) {
  const payload = await botPayload()
  const student = await studentFromRequest(payload, request)
  if (!student) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body required' }, { status: 400 })
  }
  const data: Record<string, string> = {}
  if (body.email !== undefined) {
    const text = clean(body.email, 254)
    const email = text ? parseEmail(text) : ''
    if (email === null) return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 })
    data.email = email
  }
  if (body.course !== undefined) data.course = clean(body.course, 120)
  if (body.yearOfStudy !== undefined) data.yearOfStudy = clean(body.yearOfStudy, 20)

  const updated = Object.keys(data).length
    ? await payload.update({ collection: 'v1-students', id: student.id, data, overrideAccess: true, depth: 0 })
    : student
  return NextResponse.json(profile(updated))
}
