// Students' profile photos. Kept privately in a plain MongoDB collection (no public link, no
// Payload REST endpoint): staff see them through /api/staff/students/:id/photo and a student
// sees their own through /api/student/photo. One photo per student; a new upload replaces it.
import type { Payload } from 'payload'

const PHOTOS = 'student-photos'

/** The portal and the staff panel shrink photos to about 512 px before upload; this is a safety cap. */
export const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024

const photos = (payload: Payload) => (payload.db as any).connection.collection(PHOTOS)

/** Image type from the file's first bytes; null unless JPEG, PNG or WebP. */
export function sniffPhotoType(bytes: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to))
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  return null
}

/** Read an uploaded photo from a multipart form (`photo`); an error message when it can't be used. */
export async function photoFromForm(request: Request): Promise<{ bytes: Uint8Array; type: string } | { error: string }> {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return { error: 'Please choose a photo.' }
  }
  const file = form.get('photo')
  if (!(file instanceof File) || file.size === 0) return { error: 'Please choose a photo.' }
  if (file.size > MAX_PHOTO_BYTES) return { error: 'The photo is too large. Please use a smaller one.' }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const type = sniffPhotoType(bytes)
  return type ? { bytes, type } : { error: 'Please upload a JPG, PNG or WebP photo.' }
}

/** Save the photo and stamp the student's record (photoUploadedAt tells pages a photo exists). */
export async function saveStudentPhoto(payload: Payload, studentId: string, bytes: Uint8Array, contentType: string) {
  const at = new Date()
  await photos(payload).updateOne(
    { studentId: String(studentId) },
    { $set: { studentId: String(studentId), contentType, size: bytes.length, data: Buffer.from(bytes), uploadedAt: at } },
    { upsert: true },
  )
  await payload.update({ collection: 'v1-students', id: studentId, overrideAccess: true, depth: 0, data: { photoUploadedAt: at.toISOString() } as any })
  return at.toISOString()
}

export async function getStudentPhoto(payload: Payload, studentId: string) {
  const doc = await photos(payload).findOne({ studentId: String(studentId) })
  if (!doc) return null
  const data: Uint8Array = doc.data?.buffer ? new Uint8Array(doc.data.buffer) : new Uint8Array(doc.data)
  return { contentType: doc.contentType as string, data }
}

export async function deleteStudentPhoto(payload: Payload, studentId: string, clearField = true) {
  await photos(payload).deleteOne({ studentId: String(studentId) })
  if (clearField) await payload.update({ collection: 'v1-students', id: studentId, overrideAccess: true, depth: 0, data: { photoUploadedAt: null } as any }).catch(() => {})
}

export const photoResponse = (photo: { contentType: string; data: Uint8Array }) =>
  new Response(Buffer.from(photo.data), {
    headers: {
      'Content-Type': photo.contentType,
      // The URL carries ?v=<upload time>, so a private cache is safe and keeps lists fast
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  })
