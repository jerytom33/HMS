// WhatsApp messages to students through the "HMS student notifications" workflow: HMS posts an
// event, the workflow sends the matching approved template from Kasia's channel
// (booking_paid -> kasia_booking_paid, contract_generated -> kasia_contract_ready).
// The workflow ignores calls with a wrong secret and answers 200 even when WhatsApp doesn't
// deliver (template pending, empty wallet), so a sent request is not a delivered message.
import type { Payload, PayloadRequest } from 'payload'

import { findStudentByWhatsapp, normalizeWhatsapp } from './studentAuth'

export type NotifyEvent = 'booking_paid' | 'contract_generated'

/** Placeholder for template variables that would otherwise be empty (Meta rejects empty values). */
const NONE = '-'

/** Where the student lives on the live site; links in messages point here. */
const PRODUCTION_SITE = 'https://hms-sigma-gold.vercel.app'

let warnedUnset = false

/** Site address for links: NEXT_PUBLIC_SERVER_URL, else the request's host, else production. */
export function siteUrl(origin?: string | null) {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/+$/, '')
  if (configured) return configured
  if (origin) return origin.replace(/\/+$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return vercel ? `https://${vercel}` : PRODUCTION_SITE
}

/** "Bukowiecka 11, Room 202, Bed B"; "your room" when nothing is known (templates can't take empty values). */
export function bookingPlace(booking: { hostel?: string; room?: string; bed?: string } | null | undefined) {
  const room = String(booking?.room || '').trim()
  let bed = String(booking?.bed || '').trim()
  // Apartment beds repeat the bedroom the room already names ("… · Bedroom 2" + "Bedroom 2 · Bed B")
  const bedroom = bed.includes(' · ') ? bed.slice(0, bed.indexOf(' · ')) : ''
  if (bedroom && room.endsWith(bedroom)) bed = bed.slice(bedroom.length + 3)
  const parts = [booking?.hostel, room, bed ? (/^bed\b/i.test(bed) || bed.includes('Bed ') ? bed : `Bed ${bed}`) : '']
    .map((p) => String(p || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join(', ') : 'your room'
}

/**
 * POST one event to NOTIFY_WEBHOOK_URL. Never throws; resolves false when nothing was sent
 * (not configured, no WhatsApp number, network error, timeout or an error status).
 */
export async function sendStudentNotification(
  event: NotifyEvent,
  data: { whatsapp: string; name?: string; place?: string; link?: string },
): Promise<boolean> {
  const url = process.env.NOTIFY_WEBHOOK_URL
  if (!url) {
    if (!warnedUnset) console.warn('NOTIFY_WEBHOOK_URL is not set: student WhatsApp notifications are not sent')
    warnedUnset = true
    return false
  }
  const whatsapp = normalizeWhatsapp(data.whatsapp)
  if (!whatsapp) return false
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        whatsapp,
        name: data.name?.trim() || 'there',
        place: data.place?.trim() || 'your room',
        ...(event === 'booking_paid' ? { link: data.link } : {}),
        secret: process.env.NOTIFY_WEBHOOK_SECRET || '',
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) console.error(`Student notification ${event} to ${whatsapp}: webhook answered ${res.status}`)
    return res.ok
  } catch (error) {
    console.error(`Student notification ${event} to ${whatsapp} failed:`, error)
    return false
  }
}

/**
 * Send `event` for a v1-bot-bookings document: name from the booking, else the student's
 * record; the profile link (passport upload) for booking_paid. The outcome is added to the
 * booking's notes for staff. Never throws. Inside a v1-bot-bookings hook, pass the hook's `req`
 * so the note is saved in the same transaction (a separate write would wait for it: deadlock).
 */
export async function notifyFromBooking(
  event: NotifyEvent,
  booking: any,
  payload: Payload,
  opts: { origin?: string | null; req?: PayloadRequest } = {},
): Promise<boolean> {
  try {
    const whatsapp = normalizeWhatsapp(booking?.whatsapp)
    if (!whatsapp) return false
    let name = String(booking.name || '').trim()
    if (!name) name = String((await findStudentByWhatsapp(payload, whatsapp))?.name || '').trim()
    const sent = await sendStudentNotification(event, {
      whatsapp,
      name,
      place: bookingPlace(booking),
      link: `${siteUrl(opts.origin)}/student/profile#documents`,
    })
    if (process.env.NOTIFY_WEBHOOK_URL) await noteOnBooking(payload, booking, `WhatsApp ${event === 'booking_paid' ? 'payment confirmation' : 'contract ready'} message ${sent ? 'sent to the workflow' : 'could not be sent'} ${new Date().toISOString()}.`, opts.req)
    return sent
  } catch (error) {
    console.error(`Student notification ${event} for ${booking?.ref} failed:`, error)
    return false
  }
}

/** Append a line to the booking's notes without running its hooks again. */
async function noteOnBooking(payload: Payload, booking: any, line: string, req?: PayloadRequest) {
  const fresh: any = await payload.findByID({ collection: 'v1-bot-bookings', id: booking.id, overrideAccess: true, depth: 0, req })
  await payload.update({
    collection: 'v1-bot-bookings',
    id: booking.id,
    overrideAccess: true,
    depth: 0,
    req,
    data: { notes: [fresh?.notes, line].filter(Boolean).join('\n') } as any,
  })
}

/**
 * Tell the admins and the student about a new bed hold (website or bot): the workflow sends the
 * approved kasia_admin_booking_alert template to each admin number, and kasia_bed_on_hold
 * ("your bed is on hold; our team will confirm and contact you") to the student, using
 * `studentName`, `place` and `ref`. Never throws; false when nothing
 * was sent (not configured, network error, timeout or an error status).
 */
export async function notifyAdminsOfBooking(booking: any): Promise<boolean> {
  const url = process.env.NOTIFY_WEBHOOK_URL
  if (!url || !booking) return false
  const text = (v: unknown) => String(v ?? '').trim() || NONE
  const roomBed = bookingPlace({ room: booking.room, bed: booking.bed })
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'booking_created',
        name: text(booking.name),
        whatsapp: normalizeWhatsapp(booking.whatsapp) || NONE,
        hostel: text(booking.hostel),
        roomBed: roomBed === 'your room' ? NONE : roomBed,
        arrivalDate: text(booking.arrivalDate),
        ref: text(booking.ref),
        // For the student's "bed on hold" message
        studentName: String(booking.name ?? '').trim() || 'there',
        place: bookingPlace(booking),
        secret: process.env.NOTIFY_WEBHOOK_SECRET || '',
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) console.error(`Admin booking alert for ${booking.ref}: webhook answered ${res.status}`)
    return res.ok
  } catch (error) {
    console.error(`Admin booking alert for ${booking?.ref} failed:`, error)
    return false
  }
}
