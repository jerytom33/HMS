// Student portal accounts and sessions. Students are v1-students records found by their
// WhatsApp number. They log in with a one-time code the WhatsApp bot fetches from
// /api/bot/login-code and sends them; the portal session is a signed, httpOnly cookie.
import { createHash, createHmac, randomInt, timingSafeEqual } from 'crypto'
import type { Payload } from 'payload'

import { GENDER_LABELS, parseGender, type StudentGender } from './botRooms'

export const STUDENT_COOKIE = 'hms-student-session'
export const SESSION_DAYS = 7
export const CODE_MINUTES = 10
const MAX_CODE_ATTEMPTS = 5
const STUDENTS = 'v1-students'

const secret = () => {
  const s = process.env.PAYLOAD_SECRET
  if (!s) throw new Error('PAYLOAD_SECRET is not configured')
  return s
}

/** WhatsApp numbers arrive as "+48 507 873 416", "0048 507…", "48507873416": digits only, no 00 prefix. */
export const normalizeWhatsapp = (value: unknown) => String(value ?? '').trim().replace(/^00/, '').replace(/\D/g, '')

const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url')

/** Session token: base64url(JSON {sid, wa, exp}) + "." + HMAC. */
export function signSession(studentId: string, whatsapp: string): string {
  const body = Buffer.from(JSON.stringify({ sid: studentId, wa: whatsapp, exp: Date.now() + SESSION_DAYS * 86400_000 })).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifySession(token: string | undefined | null): { sid: string; wa: string } | null {
  if (!token || !token.includes('.')) return null
  const [body, mac] = token.split('.')
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(mac || '')
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (typeof data.sid !== 'string' || typeof data.wa !== 'string' || !(data.exp > Date.now())) return null
    return { sid: data.sid, wa: data.wa }
  } catch {
    return null
  }
}

const cookieValue = (request: Request, name: string) =>
  (request.headers.get('cookie') || '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1)

/** The signed-in student for a request, or null. */
export async function studentFromRequest(payload: Payload, request: Request) {
  const session = verifySession(cookieValue(request, STUDENT_COOKIE))
  if (!session) return null
  try {
    const student: any = await payload.findByID({ collection: STUDENTS, id: session.sid, overrideAccess: true, depth: 0 })
    // A changed WhatsApp number ends old sessions
    return student && normalizeWhatsapp(student.whatsapp) === session.wa ? student : null
  } catch {
    return null
  }
}

/** Student with this WhatsApp number (also matches students staff created with it as phone). */
export async function findStudentByWhatsapp(payload: Payload, whatsapp: string) {
  if (!whatsapp) return null
  const direct = await payload.find({ collection: STUDENTS, overrideAccess: true, depth: 0, limit: 1, where: { whatsapp: { equals: whatsapp } } })
  if (direct.docs[0]) return direct.docs[0] as any
  const withPhone = await payload.find({ collection: STUDENTS, overrideAccess: true, depth: 0, pagination: false, where: { phone: { exists: true } } })
  return (withPhone.docs as any[]).find((s) => normalizeWhatsapp(s.phone) === whatsapp) || null
}

/**
 * Create or update the student behind a WhatsApp number with what the bot collected.
 * Only fields that were given are changed; gender is stored as "Male" / "Female" / "Other".
 */
export async function saveStudentFromBot(
  payload: Payload,
  data: { whatsapp: string; name?: string; gender?: StudentGender | null; email?: string | null },
) {
  const existing = await findStudentByWhatsapp(payload, data.whatsapp)
  const changes: Record<string, string> = { whatsapp: data.whatsapp }
  if (data.name) changes.name = data.name
  if (data.gender) changes.gender = GENDER_LABELS[data.gender]
  if (data.email) changes.email = data.email
  if (existing) {
    return payload.update({ collection: STUDENTS, id: existing.id, overrideAccess: true, data: changes }) as Promise<any>
  }
  return payload.create({
    collection: STUDENTS,
    overrideAccess: true,
    data: { ...changes, phone: `+${data.whatsapp}`, status: 'Prospective' },
  }) as Promise<any>
}

const hashCode = (whatsapp: string, code: string) => createHash('sha256').update(`${secret()}:${whatsapp}:${code}`).digest('hex')

/**
 * New one-time login code for a student; replaces any earlier one. Stored hashed with an
 * expiry and an attempt counter (on fields hidden from every API, staff included).
 */
export async function issueLoginCode(payload: Payload, student: any): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const whatsapp = normalizeWhatsapp(student.whatsapp)
  await (payload.db as any).collections[STUDENTS].collection.updateOne(
    { _id: (payload.db as any).collections[STUDENTS].base.Types.ObjectId.createFromHexString(String(student.id)) },
    { $set: { loginCodeHash: hashCode(whatsapp, code), loginCodeExpires: new Date(Date.now() + CODE_MINUTES * 60_000), loginCodeAttempts: 0 } },
  )
  return code
}

/**
 * Check a login code. A code works once, for CODE_MINUTES, and stops working after
 * MAX_CODE_ATTEMPTS wrong tries.
 */
export async function checkLoginCode(payload: Payload, whatsapp: string, code: string) {
  const student = await findStudentByWhatsapp(payload, whatsapp)
  if (!student) return { ok: false as const, reason: 'invalid_code' as const }
  const Model = (payload.db as any).collections[STUDENTS]
  const _id = Model.base.Types.ObjectId.createFromHexString(String(student.id))
  const raw = await Model.collection.findOne({ _id }, { projection: { loginCodeHash: 1, loginCodeExpires: 1, loginCodeAttempts: 1 } })
  if (!raw?.loginCodeHash || !(raw.loginCodeExpires > new Date())) return { ok: false as const, reason: 'expired_code' as const }
  if ((raw.loginCodeAttempts || 0) >= MAX_CODE_ATTEMPTS) return { ok: false as const, reason: 'too_many_attempts' as const }

  const expected = Buffer.from(raw.loginCodeHash)
  const given = Buffer.from(hashCode(normalizeWhatsapp(student.whatsapp || whatsapp), String(code).replace(/\D/g, '')))
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await Model.collection.updateOne({ _id }, { $inc: { loginCodeAttempts: 1 } })
    return { ok: false as const, reason: 'invalid_code' as const }
  }
  // Single use; also make sure the student's whatsapp field is set for future logins
  await Model.collection.updateOne({ _id }, { $unset: { loginCodeHash: '', loginCodeExpires: '', loginCodeAttempts: '' }, $set: { whatsapp } })
  return { ok: true as const, student: { ...student, whatsapp } }
}

/** The student's gender from their record ("Male", "female", ...), or null when unknown. */
export const studentGender = (student: any): StudentGender | null => parseGender(student?.gender)

export const sessionCookie = (token: string) => ({
  name: STUDENT_COOKIE,
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_DAYS * 86400,
})
