import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'
import { getStudentPhoto, photoFromForm, photoResponse, saveStudentPhoto } from '@/lib/studentPhoto'
import { studentFromRequest } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/** GET /api/student/photo: the signed-in student's own profile photo. */
export async function GET(request: Request) {
  const payload = await botPayload()
  const student = await studentFromRequest(payload, request)
  if (!student) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })
  const photo = await getStudentPhoto(payload, String(student.id))
  return photo ? photoResponse(photo) : NextResponse.json({ ok: false, error: 'No photo' }, { status: 404 })
}

/** POST /api/student/photo  multipart/form-data: photo. The student sets or replaces their own photo. */
export async function POST(request: Request) {
  const payload = await botPayload()
  const student = await studentFromRequest(payload, request)
  if (!student) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })
  const photo = await photoFromForm(request)
  if ('error' in photo) return NextResponse.json({ ok: false, message: photo.error }, { status: 400 })
  return NextResponse.json({ ok: true, photoUploadedAt: await saveStudentPhoto(payload, String(student.id), photo.bytes, photo.type) })
}
