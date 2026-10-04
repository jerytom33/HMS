// Failed portal logins are limited per WhatsApp number and per IP, so passwords can't be
// guessed. Only failures count; the limit applies to every number alike, registered or not,
// so it never reveals which numbers have an account.
import type { Payload } from 'payload'

import { normalizeWhatsapp } from './studentAuth'

export type Limit = { seconds: number; max: number }

/** 5 wrong tries for a number in 15 minutes. */
export const NUMBER_LIMITS: Limit[] = [{ seconds: 900, max: 5 }]
/** Per IP (students may share a campus network): 30 wrong tries in 15 minutes. */
export const IP_LIMITS: Limit[] = [{ seconds: 900, max: 30 }]

export const REGISTER_URL = 'https://wa.me/48518827891'

/** Seconds until another try is allowed, given earlier failure times; 0 when allowed now. */
export function waitSeconds(failedAt: Date[], limits: Limit[], now: Date = new Date()): number {
  let wait = 0
  for (const { seconds, max } of limits) {
    const inWindow = failedAt.filter((t) => now.getTime() - t.getTime() < seconds * 1000).sort((a, b) => a.getTime() - b.getTime())
    if (inWindow.length >= max) {
      const freeAt = inWindow[inWindow.length - max].getTime() + seconds * 1000
      wait = Math.max(wait, Math.ceil((freeAt - now.getTime()) / 1000))
    }
  }
  return wait
}

// Failure times live in a plain collection with a TTL index (see the migration), so they delete themselves
const FAILURES = 'login-failures'
const WINDOW_MS = 900_000
const failures = (payload: Payload) => (payload.db as any).connection.collection(FAILURES)

const keysFor = (whatsapp: string, ip: string) => [`wa:${normalizeWhatsapp(whatsapp)}`, ...(ip ? [`ip:${ip}`] : [])]

/** The visitor's IP on Vercel (first x-forwarded-for entry), or '' when unknown. */
export const clientIp = (request: Request) =>
  (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || ''

/** Seconds this number / IP must wait before trying again; 0 when a try is allowed. */
export async function loginWait(payload: Payload, whatsapp: string, ip: string): Promise<number> {
  const [numberKey, ipKey] = keysFor(whatsapp, ip)
  const since = new Date(Date.now() - WINDOW_MS)
  const times = async (key: string) =>
    (await failures(payload).find({ key, at: { $gt: since } }, { projection: { at: 1 } }).toArray()).map((d: any) => d.at as Date)
  const [numberTimes, ipTimes] = await Promise.all([times(numberKey), ipKey ? times(ipKey) : Promise.resolve([])])
  return Math.max(waitSeconds(numberTimes, NUMBER_LIMITS), waitSeconds(ipTimes, IP_LIMITS))
}

export async function recordLoginFailure(payload: Payload, whatsapp: string, ip: string) {
  const at = new Date()
  await failures(payload).insertMany(keysFor(whatsapp, ip).map((key) => ({ key, at })))
}

/** A successful login clears the number's failures (not the IP's). */
export async function clearLoginFailures(payload: Payload, whatsapp: string) {
  await failures(payload).deleteMany({ key: keysFor(whatsapp, '')[0] })
}

export const waitMessage = (seconds: number) =>
  `Too many tries. Please wait ${seconds < 120 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`} and try again.`
