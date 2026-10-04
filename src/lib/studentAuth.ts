// Student portal accounts and sessions. Students are v1-students records found by their
// WhatsApp number. The WhatsApp bot registers them and sends a personal link (linkToken)
// that opens a browse-only session: rooms for their gender, no bookings or profile. A full
// portal session needs a one-time code sent to their WhatsApp (see otp.ts): at login, or
// when they hold a bed from a browse session. Sessions are signed, httpOnly cookies.
import { createHash, createHmac, randomInt, timingSafeEqual } from 'crypto'
import type { Payload } from 'payload'

import { GENDER_LABELS, parseGender, type StudentGender } from './botRooms'

export const STUDENT_COOKIE = 'hms-student-session'
export const BROWSE_COOKIE = 'hms-student-browse'
export const SESSION_DAYS = 7
export const LINK_DAYS = 7
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

/**
 * What a signed token is for: 's' full portal session, 'b' browse-only session,
 * 'l' personal link from the bot. Tokens of one kind never work as another
 * (session tokens from before kinds existed have none and count as 's').
 */
export type TokenKind = 's' | 'b' | 'l'

/** Signed token: base64url(JSON {k, sid, wa, exp}) + "." + HMAC. */
export function signToken(kind: TokenKind, studentId: string, whatsapp: string, expiresAt: number): string {
  const body = Buffer.from(JSON.stringify({ k: kind, sid: studentId, wa: whatsapp, exp: expiresAt })).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifyToken(token: string | undefined | null, kind: TokenKind, now = Date.now()): { sid: string; wa: string; exp: number } | null {
  if (!token || !token.includes('.')) return null
  const [body, mac] = token.split('.')
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(mac || '')
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString())
    if ((data.k ?? 's') !== kind) return null
    if (typeof data.sid !== 'string' || typeof data.wa !== 'string' || !(data.exp > now)) return null
    return { sid: data.sid, wa: data.wa, exp: data.exp }
  } catch {
    return null
  }
}

/** Full portal session token, valid SESSION_DAYS. */
export const signSession = (studentId: string, whatsapp: string) =>
  signToken('s', studentId, whatsapp, Date.now() + SESSION_DAYS * 86400_000)

export const verifySession = (token: string | undefined | null) => verifyToken(token, 's')

/** Personal link token the bot sends after registration, valid LINK_DAYS. */
export const linkToken = (studentId: string, whatsapp: string, now = Date.now()) =>
  signToken('l', studentId, whatsapp, now + LINK_DAYS * 86400_000)

const cookieValue = (request: Request, name: string) =>
  (request.headers.get('cookie') || '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1)

/** Student a verified token points at, while its WhatsApp number still matches. */
async function studentForToken(payload: Payload, session: { sid: string; wa: string } | null) {
  if (!session) return null
  try {
    const student: any = await payload.findByID({ collection: STUDENTS, id: session.sid, overrideAccess: true, depth: 0 })
    // A changed WhatsApp number ends old sessions
    return student && normalizeWhatsapp(student.whatsapp) === session.wa ? student : null
  } catch {
    return null
  }
}

/** The signed-in student (full portal session) for a request, or null. */
export const studentFromRequest = (payload: Payload, request: Request) =>
  studentForToken(payload, verifySession(cookieValue(request, STUDENT_COOKIE)))

/**
 * The student for a request with a full session or a browse session from their personal link.
 * `verified` is true only for a full session. Use only for room listing and starting a booking.
 */
export async function browsingStudent(payload: Payload, request: Request) {
  const full = await studentFromRequest(payload, request)
  if (full) return { student: full, verified: true as const }
  const student = await studentForToken(payload, verifyToken(cookieValue(request, BROWSE_COOKIE), 'b'))
  return student ? { student, verified: false as const } : null
}

/** Student behind a personal link token, or null when it is forged, expired or outdated. */
export const studentFromLink = (payload: Payload, token: string | null | undefined) =>
  studentForToken(payload, verifyToken(token, 'l'))

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
 * The bot collects only name, gender and arrival date; the number comes from the chat.
 */
export async function saveStudentFromBot(
  payload: Payload,
  data: { whatsapp: string; name?: string; gender?: StudentGender | null; arrivalDate?: string | null },
) {
  const existing = await findStudentByWhatsapp(payload, data.whatsapp)
  const changes: Record<string, string> = { whatsapp: data.whatsapp }
  if (data.name) changes.name = data.name
  if (data.gender) changes.gender = GENDER_LABELS[data.gender]
  if (data.arrivalDate) changes.arrivalDate = data.arrivalDate
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
export async function issueLoginCode(payload: Payload, student: any, whatsappUsed?: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  // Staff-created students may have the number only as phone; checkLoginCode hashes the same way
  const whatsapp = normalizeWhatsapp(student.whatsapp || whatsappUsed)
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
  // Single use; the code proves the student owns the number, so record that and keep whatsapp set
  await Model.collection.updateOne({ _id }, { $unset: { loginCodeHash: '', loginCodeExpires: '', loginCodeAttempts: '' }, $set: { whatsapp, phoneVerifiedAt: new Date() } })
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

/** Browse-only session cookie from a personal link; it lasts as long as the link would have. */
export const browseCookie = (studentId: string, whatsapp: string, expiresAt: number) => ({
  name: BROWSE_COOKIE,
  value: signToken('b', studentId, whatsapp, expiresAt),
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
})

/** Calendar date in Poland (Europe/Warsaw) as [year, month, day]. */
function warsawToday(now: Date): [number, number, number] {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return [get('year'), get('month'), get('day')]
}

const pad = (n: number) => String(n).padStart(2, '0')
const formatDMY = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`

/** Months after which an arrival date is too far ahead. */
export const ARRIVAL_MAX_MONTHS = 6

/**
 * An arrival date the student typed ("15/02/2027", also 15-2-2027 or 15.02.2027).
 * It must be a real date after today (Poland time) and at most ARRIVAL_MAX_MONTHS ahead.
 */
export function parseArrivalDate(input: unknown, now: Date = new Date()): { ok: true; date: string } | { ok: false; message: string } {
  const [ty, tm, td] = warsawToday(now)
  const today = new Date(Date.UTC(ty, tm - 1, td))
  const first = new Date(Date.UTC(ty, tm - 1, td + 1))
  // Same day number six months on, or the month's last day when it has fewer days
  const lastDayOfTarget = new Date(Date.UTC(ty, tm - 1 + ARRIVAL_MAX_MONTHS + 1, 0)).getUTCDate()
  const last = new Date(Date.UTC(ty, tm - 1 + ARRIVAL_MAX_MONTHS, Math.min(td, lastDayOfTarget)))
  const range = `between ${formatDMY(first)} and ${formatDMY(last)}`

  const m = String(input ?? '').trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/)
  if (!m) return { ok: false, message: `Please send the date as DD/MM/YYYY, ${range} 📅` }
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { ok: false, message: `That date doesn't exist. Please send a date ${range} 📅` }
  }
  if (date <= today) return { ok: false, message: `The arrival date must be in the future. Please send a date ${range} 📅` }
  if (date > last) return { ok: false, message: `We take bookings up to ${ARRIVAL_MAX_MONTHS} months ahead. Please send a date ${range} 📅` }
  return { ok: true, date: formatDMY(date) }
}

const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`

/** First and last allowed arrival dates as YYYY-MM-DD, for a date picker's min/max. */
export function arrivalRange(now: Date = new Date()): { min: string; max: string } {
  const [ty, tm, td] = warsawToday(now)
  const lastDayOfTarget = new Date(Date.UTC(ty, tm - 1 + ARRIVAL_MAX_MONTHS + 1, 0)).getUTCDate()
  return {
    min: iso(new Date(Date.UTC(ty, tm - 1, td + 1))),
    max: iso(new Date(Date.UTC(ty, tm - 1 + ARRIVAL_MAX_MONTHS, Math.min(td, lastDayOfTarget)))),
  }
}

/** The portal's date picker sends YYYY-MM-DD; check it with the same rule as parseArrivalDate. */
export function parsePortalArrivalDate(input: unknown, now: Date = new Date()) {
  const m = String(input ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return parseArrivalDate(m ? `${m[3]}/${m[2]}/${m[1]}` : input, now)
}

/** "15/02/2027" -> "2027-02-15" (for pre-filling a date picker); '' when not a DD/MM/YYYY date. */
export function dmyToIso(dmy: unknown): string {
  const m = String(dmy ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
}
