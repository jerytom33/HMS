// One-time codes sent to a student's WhatsApp through the OTP workflow (approved template
// kasia_login_code). Every code is a paid WhatsApp message, so sends are rate-limited per
// number and per IP. The number limit applies whether or not the number is registered, so
// responses never reveal which numbers have a student record.
import type { Payload } from 'payload'

import { findStudentByWhatsapp, issueLoginCode, normalizeWhatsapp } from './studentAuth'

export type Limit = { seconds: number; max: number }

/** At most 1 code a minute and 5 an hour for a number. */
export const NUMBER_LIMITS: Limit[] = [{ seconds: 60, max: 1 }, { seconds: 3600, max: 5 }]
/** Per IP (students may share a campus network): 10 in 10 minutes, 20 an hour. */
export const IP_LIMITS: Limit[] = [{ seconds: 600, max: 10 }, { seconds: 3600, max: 20 }]

/** Text shown after every code request, sent or not. */
export const NEUTRAL_MESSAGE = "If this number is registered, we've sent a code to your WhatsApp. It works once, for 10 minutes."
export const REGISTER_URL = 'https://wa.me/48518827891'

/**
 * Seconds until another send is allowed, given earlier send times; 0 when allowed now.
 */
export function waitSeconds(sentAt: Date[], limits: Limit[], now: Date = new Date()): number {
  let wait = 0
  for (const { seconds, max } of limits) {
    const inWindow = sentAt.filter((t) => now.getTime() - t.getTime() < seconds * 1000).sort((a, b) => a.getTime() - b.getTime())
    if (inWindow.length >= max) {
      const freeAt = inWindow[inWindow.length - max].getTime() + seconds * 1000
      wait = Math.max(wait, Math.ceil((freeAt - now.getTime()) / 1000))
    }
  }
  return wait
}

// Send times live in a plain collection with a TTL index, so old entries delete themselves
const SENDS = 'otp-sends'
let indexReady: Promise<unknown> | null = null
const sends = (payload: Payload) => {
  const collection = (payload.db as any).connection.collection(SENDS)
  indexReady ??= collection.createIndex({ at: 1 }, { expireAfterSeconds: 3600 }).catch(() => (indexReady = null))
  return collection
}

async function sentTimes(payload: Payload, key: string): Promise<Date[]> {
  const docs = await sends(payload).find({ key, at: { $gt: new Date(Date.now() - 3600_000) } }, { projection: { at: 1 } }).toArray()
  return docs.map((d: any) => d.at)
}

/** The visitor's IP on Vercel (first x-forwarded-for entry), or '' when unknown. */
export const clientIp = (request: Request) =>
  (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || ''

/**
 * POST the code to the OTP workflow. The workflow ignores calls with a wrong secret and answers
 * 200 even when it sends nothing, so true means only "the workflow accepted the request".
 */
export async function sendOtpWebhook(whatsapp: string, code: string): Promise<boolean> {
  const url = process.env.OTP_WEBHOOK_URL
  const secret = process.env.OTP_WEBHOOK_SECRET
  if (!url || !secret) {
    console.error('OTP webhook is not configured (OTP_WEBHOOK_URL / OTP_WEBHOOK_SECRET)')
    return false
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp: normalizeWhatsapp(whatsapp), code, secret }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) console.error(`OTP webhook answered ${res.status}`)
    return res.ok
  } catch (error) {
    console.error('OTP webhook call failed:', error)
    return false
  }
}

export type CodeRequest =
  | { ok: true; sent: boolean }
  | { ok: false; reason: 'rate_limited'; retryAfterSeconds: number; message: string }

/**
 * Send a new code to a registered number, within the rate limits. `sent` is false for numbers
 * with no student record; callers must answer both cases the same way (NEUTRAL_MESSAGE).
 */
export async function requestCode(payload: Payload, input: { whatsapp: string; ip?: string }): Promise<CodeRequest> {
  const whatsapp = normalizeWhatsapp(input.whatsapp)
  const keys = [`wa:${whatsapp}`, ...(input.ip ? [`ip:${input.ip}`] : [])]
  const [numberTimes, ipTimes] = await Promise.all(keys.map((k) => sentTimes(payload, k)))
  const wait = Math.max(waitSeconds(numberTimes, NUMBER_LIMITS), ipTimes ? waitSeconds(ipTimes, IP_LIMITS) : 0)
  if (wait > 0) {
    const when = wait < 120 ? `${wait} seconds` : `${Math.ceil(wait / 60)} minutes`
    return { ok: false, reason: 'rate_limited', retryAfterSeconds: wait, message: `Please wait ${when} before asking for another code.` }
  }
  const at = new Date()
  await sends(payload).insertMany(keys.map((key) => ({ key, at })))

  const student = await findStudentByWhatsapp(payload, whatsapp)
  if (!student) return { ok: true, sent: false }
  const code = await issueLoginCode(payload, student, whatsapp)
  await sendOtpWebhook(whatsapp, code)
  return { ok: true, sent: true }
}
