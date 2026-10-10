import { NextResponse } from 'next/server'

import { isStaffUser } from '@/access'
import { botPayload } from '@/lib/botServer'
import { deleteStudentPhoto, getStudentPhoto, photoFromForm, photoResponse, saveStudentPhoto } from '@/lib/studentPhoto'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

async function staff(request: Request) {
  const payload = await botPayload()
  const { user } = await payload.auth({ headers: request.headers })
  return isStaffUser(user) ? payload : null
}
const denied = () => NextResponse.json({ ok: false, error: 'Staff login required' }, { status: 401 })

/** GET /api/staff/students/:id/photo (staff): the student's profile photo. */
export async function GET(request: Request, { params }: Ctx) {
  const payload = await staff(request)
  if (!payload) return denied()
  const photo = await getStudentPhoto(payload, (await params).id)
  return photo ? photoResponse(photo) : NextResponse.json({ ok: false, error: 'No photo' }, { status: 404 })
}

/** POST /api/staff/students/:id/photo (staff)  multipart/form-data: photo. Sets or replaces the photo. */
export async function POST(request: Request, { params }: Ctx) {
  const payload = await staff(request)
  if (!payload) return denied()
  const { id } = await params
  const student = await payload.findByID({ collection: 'v1-students', id, overrideAccess: true, depth: 0 }).catch(() => null)
  if (!student) return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 })
  const photo = await photoFromForm(request)
  if ('error' in photo) return NextResponse.json({ ok: false, message: photo.error }, { status: 400 })
  return NextResponse.json({ ok: true, photoUploadedAt: await saveStudentPhoto(payload, id, photo.bytes, photo.type) })
}

/** DELETE /api/staff/students/:id/photo (staff): removes the photo. */
export async function DELETE(request: Request, { params }: Ctx) {
  const payload = await staff(request)
  if (!payload) return denied()
  await deleteStudentPhoto(payload, (await params).id)
  return NextResponse.json({ ok: true })
}
