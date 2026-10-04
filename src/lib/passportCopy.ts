// Passport copies (photo or scan) students upload for their lease agreement. They are kept in
// a plain MongoDB collection that no Payload REST endpoint exposes; staff open them through
// /api/staff/students/:id/passport-copy only. One copy per student; a new upload replaces it.
import type { Payload } from 'payload'

const COPIES = 'passport-copies'

/** Vercel accepts request bodies up to 4.5 MB; the portal shrinks photos well below this. */
export const MAX_COPY_BYTES = 4 * 1024 * 1024

const copies = (payload: Payload) => (payload.db as any).connection.collection(COPIES)

/** The file type from its first bytes (never the name or the browser's claim); null when not allowed. */
export function sniffCopyType(bytes: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to))
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png'
  if (ascii(0, 4) === '%PDF') return 'application/pdf'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (ascii(4, 8) === 'ftyp' && ['heic', 'heix', 'mif1', 'msf1', 'heif'].includes(ascii(8, 12))) return 'image/heic'
  return null
}

export async function savePassportCopy(payload: Payload, studentId: string, bytes: Uint8Array, contentType: string) {
  await copies(payload).updateOne(
    { studentId: String(studentId) },
    { $set: { studentId: String(studentId), contentType, size: bytes.length, data: Buffer.from(bytes), uploadedAt: new Date() } },
    { upsert: true },
  )
}

/** The student's copy with its bytes, or null. */
export async function getPassportCopy(payload: Payload, studentId: string) {
  const doc = await copies(payload).findOne({ studentId: String(studentId) })
  if (!doc) return null
  const data: Uint8Array = doc.data?.buffer ? new Uint8Array(doc.data.buffer) : new Uint8Array(doc.data)
  return { contentType: doc.contentType as string, data, uploadedAt: doc.uploadedAt as Date }
}

export async function hasPassportCopy(payload: Payload, studentId: string) {
  return (await copies(payload).countDocuments({ studentId: String(studentId) }, { limit: 1 })) > 0
}

export async function deletePassportCopy(payload: Payload, studentId: string) {
  await copies(payload).deleteOne({ studentId: String(studentId) })
}

export const copyExtension = (contentType: string) =>
  ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' } as Record<string, string>)[contentType] || 'bin'
