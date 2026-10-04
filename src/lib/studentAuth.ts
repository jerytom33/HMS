// Student portal accounts and sessions. Students are v1-students records found by their
// WhatsApp number. The WhatsApp bot registers them and sends a personal link (linkToken);
// on it they set a password, which signs them in. Later they log in with their number and
// password. Forgot it? The bot sends a new link. Setting a password bumps passwordVersion,
// which ends every older link and session. Sessions are signed, httpOnly cookies.
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'crypto'
import type { Payload } from 'payload'
import { promisify } from 'util'

import { GENDER_LABELS, parseGender, type StudentGender } from './botRooms'

export const STUDENT_COOKIE = 'hms-student-session'
export const SESSION_DAYS = 7
export const LINK_DAYS = 7
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128
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
 * What a signed token is for: 's' portal session, 'l' personal link from the bot. A token of
 * one kind never works as the other (session tokens from before kinds existed count as 's').
 * `pv` is the student's passwordVersion when the token was made (missing = 0).
 */
export type TokenKind = 's' | 'l'
export type TokenData = { sid: string; wa: string; pv: number; exp: number }

/** Signed token: base64url(JSON {k, sid, wa, pv, exp}) + "." + HMAC. */
export function signToken(kind: TokenKind, studentId: string, whatsapp: string, pv: number, expiresAt: number): string {
  const body = Buffer.from(JSON.stringify({ k: kind, sid: studentId, wa: whatsapp, pv, exp: expiresAt })).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifyToken(token: string | undefined | null, kind: TokenKind, now = Date.now()): TokenData | null {
  if (!token || !token.includes('.')) return null
  const [body, mac] = token.split('.')
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(mac || '')
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString())
    if ((data.k ?? 's') !== kind) return null
    if (typeof data.sid !== 'string' || typeof data.wa !== 'string' || !(data.exp > now)) return null
    return { sid: data.sid, wa: data.wa, pv: Number(data.pv) || 0, exp: data.exp }
  } catch {
    return null
  }
}

/** Portal session token, valid SESSION_DAYS. */
export const signSession = (studentId: string, whatsapp: string, pv: number) =>
  signToken('s', studentId, whatsapp, pv, Date.now() + SESSION_DAYS * 86400_000)

export const verifySession = (token: string | undefined | null) => verifyToken(token, 's')

/** Personal link token the bot sends, valid LINK_DAYS or until the next password is set. */
export const linkToken = (studentId: string, whatsapp: string, pv: number, now = Date.now()) =>
  signToken('l', studentId, whatsapp, pv, now + LINK_DAYS * 86400_000)

export const passwordVersion = (student: any) => Number(student?.passwordVersion) || 0

const cookieValue = (request: Request, name: string) =>
  (request.headers.get('cookie') || '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1)

/** Student a verified token points at, while its WhatsApp number and password version still match. */
async function studentForToken(payload: Payload, token: TokenData | null) {
  if (!token) return null
  try {
    const student: any = await payload.findByID({ collection: STUDENTS, id: token.sid, overrideAccess: true, depth: 0 })
    // A changed WhatsApp number or a new password ends old sessions and links
    if (!student || normalizeWhatsapp(student.whatsapp) !== token.wa || passwordVersion(student) !== token.pv) return null
    return student
  } catch {
    return null
  }
}

/** The signed-in student for a request, or null. */
export const studentFromRequest = (payload: Payload, request: Request) =>
  studentForToken(payload, verifySession(cookieValue(request, STUDENT_COOKIE)))

/** Student behind a personal link, or null when it is forged, expired or already used to set a password. */
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

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

/** "scrypt$<salt>$<hash>" (base64url), for storing. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, 64)
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export async function passwordMatches(password: string, stored: string | null | undefined): Promise<boolean> {
  const [scheme, salt, hash] = String(stored || '').split('$')
  if (scheme !== 'scrypt' || !salt || !hash) {
    // Same work as a real check, so timing doesn't tell which numbers have a password
    await scryptAsync(password, Buffer.alloc(16), 64)
    return false
  }
  const expected = Buffer.from(hash, 'base64url')
  const given = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

/** Why a new password can't be used, or null when it is fine. */
export function passwordProblem(password: unknown): string | null {
  const text = typeof password === 'string' ? password : ''
  if (text.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`
  if (text.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`
  if (!text.trim()) return 'The password cannot be only spaces.'
  return null
}

// passwordHash is hidden from every API (staff included), so it is read and written directly
const studentsModel = (payload: Payload) => (payload.db as any).collections[STUDENTS]
const objectId = (payload: Payload, id: string) => studentsModel(payload).base.Types.ObjectId.createFromHexString(String(id))

/**
 * Save a new password. The link proves the student holds the WhatsApp number, so it is marked
 * verified. passwordVersion goes up, ending older links and sessions. Returns the new version.
 */
export async function setStudentPassword(payload: Payload, student: any, password: string): Promise<number> {
  const pv = passwordVersion(student) + 1
  await studentsModel(payload).collection.updateOne(
    { _id: objectId(payload, student.id) },
    { $set: { passwordHash: await hashPassword(password), passwordVersion: pv, phoneVerifiedAt: new Date() } },
  )
  return pv
}

/** The student with this number and password, or null (unknown number, no password yet or wrong password). */
export async function checkStudentPassword(payload: Payload, whatsapp: string, password: string) {
  const student = await findStudentByWhatsapp(payload, whatsapp)
  const raw = student
    ? await studentsModel(payload).collection.findOne({ _id: objectId(payload, student.id) }, { projection: { passwordHash: 1 } })
    : null
  return (await passwordMatches(password, raw?.passwordHash)) && student ? student : null
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

/** Calendar date in Poland (Europe/Warsaw) as [year, month, day]. */
export function warsawToday(now: Date): [number, number, number] {
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
