// Holding a bed until payment: shared by the WhatsApp bot (/api/bot/book) and the
// student portal (/api/student/book). The claim is atomic in v1-room-overrides, so two
// students can't get the same bed, and each hold is recorded in v1-bot-bookings.
import { randomInt } from 'crypto'
import type { Payload } from 'payload'

import { formatPLN } from './currency'
import { OVERRIDES, syncCounts, unitBedTotal } from './botHolds'
import { bookedBedLabel, depositText, fitBedStatuses, GENDER_LABELS, SHARING_LABELS, splitOverrideKey, type BotOverride, type BotUnit } from './botRooms'
import { defaultAmenities } from './propertyTypes'

/** Shown to the student before booking (they are asked to agree) and in both confirmations; whether they agreed is stored as minStayAgreed. */
export const MIN_STAY = '6 months (1 semester)'

export type BookingSource = 'bot' | 'portal'

/** Booking reference, e.g. "KLS-7Q4M2X" (no 0/O/1/I). */
function newRef() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  return `KLS-${Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('')}`
}

/** Create the override document for a floor room that staff never edited, so its beds can be marked. */
async function ensureOverride(payload: Payload, unit: BotUnit, existing: BotOverride | undefined, total: number) {
  const Model = (payload.db as any).collections[OVERRIDES]
  if (!existing) {
    try {
      await payload.create({
        collection: OVERRIDES,
        overrideAccess: true,
        data: {
          overrideKey: unit.overrideKey,
          propertyId: unit.propertyId,
          standalone: false,
          unitType: 'room',
          amenities: defaultAmenities('room'),
          status: 'available',
          beds: total,
          freeBeds: total,
          filledBeds: 0,
          bedStatuses: Array(total).fill(false),
          bedOccupants: Array(total).fill(null),
        } as any,
      })
    } catch {
      // Created by a parallel request (overrideKey is unique): use that one
    }
  } else if (!Array.isArray(existing.bedStatuses) || existing.bedStatuses.length < total) {
    // Older documents may lack per-bed flags; store the fitted list before claiming a bed
    await Model.collection.updateOne({ overrideKey: unit.overrideKey }, { $set: { bedStatuses: fitBedStatuses(existing, total) } })
  }
  return Model
}

export type HoldInput = {
  unit: BotUnit
  overrides: BotOverride[]
  /** The bed as the student gave it ('' for "any free bed") and its resolved index. */
  bedText: string
  wantedBed: number | null
  name: string
  whatsapp: string
  phone: string
  email: string | null
  gender: string | null
  minStayAgreed: boolean
  arrivalDate: string
  source: BookingSource
}

export type HoldResult =
  | { ok: true; booking: any; duplicate: boolean }
  | { ok: false; reason: 'no_free_beds' | 'bed_taken'; message: string }

/** Hold one free bed (the chosen one, or the first free) in `unit` until payment. */
export async function holdBed(payload: Payload, input: HoldInput): Promise<HoldResult> {
  const { unit, wantedBed, bedText, whatsapp } = input

  // A double tap or retry within 30 minutes returns the same hold (for the same bed, when one was chosen)
  const recent = await payload.find({
    collection: 'v1-bot-bookings',
    overrideAccess: true,
    limit: 1,
    where: {
      whatsapp: { equals: whatsapp },
      unit: { equals: unit.unit },
      ...(wantedBed !== null ? { bedIndex: { equals: wantedBed } } : {}),
      status: { equals: 'held' },
      createdAt: { greater_than: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    },
  })
  if (recent.docs[0]) return { ok: true, booking: recent.docs[0], duplicate: true }

  const noBeds = { ok: false as const, reason: 'no_free_beds' as const, message: 'Sorry, the last bed in that room was just taken 😔 Please choose another room.' }
  const bedTaken = { ok: false as const, reason: 'bed_taken' as const, message: 'Sorry, that bed was just booked by someone else 😔 Please choose another bed.' }
  if (!unit.freeBedIndices.length) return noBeds
  // A bed title that is not among the free beds means it was taken meanwhile
  if (bedText && (wantedBed === null || !unit.freeBedIndices.includes(wantedBed))) return bedTaken

  const existing = input.overrides.find((o) => o.overrideKey === unit.overrideKey)
  const total = existing && unit.unitType === 'apartment' ? unitBedTotal(existing) : existing ? Number(existing.beds) || unit.sharing : unit.sharing
  const Model = await ensureOverride(payload, unit, existing, total)

  // Claim the chosen bed, or else the first bed that is still free; the filter makes the claim atomic
  let claimed: { doc: any; bedIndex: number } | null = null
  for (const bedIndex of wantedBed !== null ? [wantedBed] : unit.freeBedIndices) {
    // Native driver: no Mongoose casting on the json field's array paths
    const doc = await Model.collection.findOneAndUpdate(
      { overrideKey: unit.overrideKey, status: { $ne: 'maintenance' }, [`bedStatuses.${bedIndex}`]: { $ne: true } },
      { $set: { [`bedStatuses.${bedIndex}`]: true } },
      { returnDocument: 'after' },
    )
    if (doc) {
      claimed = { doc, bedIndex }
      break
    }
  }
  if (!claimed) return wantedBed !== null ? bedTaken : noBeds
  await syncCounts(Model, claimed.doc)

  const { roomNum } = splitOverrideKey(unit.overrideKey)
  const bed = bookedBedLabel(unit.unitType, claimed.doc.subRooms, claimed.bedIndex)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const booking = await payload.create({
        collection: 'v1-bot-bookings',
        overrideAccess: true,
        data: {
          ref: newRef(),
          type: 'bed_hold',
          status: 'held',
          source: input.source,
          name: input.name,
          whatsapp,
          phone: input.phone,
          email: input.email ?? undefined,
          gender: input.gender ?? undefined,
          minStayAgreed: input.minStayAgreed,
          arrivalDate: input.arrivalDate,
          sharing: unit.sharing,
          unit: unit.unit,
          overrideKey: unit.overrideKey,
          propertyId: unit.propertyId,
          hostel: unit.hostel,
          room: unit.label || `Room ${roomNum}`,
          floor: unit.floorName,
          bedIndex: claimed.bedIndex,
          bed,
          price: unit.price ?? undefined,
          deposit: unit.deposit ?? undefined,
        } as any,
      })
      return { ok: true, booking, duplicate: false }
    } catch (error) {
      if (attempt === 2) {
        // Give the bed back so it isn't stuck without a booking
        const released = await Model.collection.findOneAndUpdate(
          { overrideKey: unit.overrideKey },
          { $set: { [`bedStatuses.${claimed.bedIndex}`]: false } },
          { returnDocument: 'after' },
        )
        if (released) await syncCounts(Model, released)
        throw error
      }
    }
  }
  throw new Error('unreachable')
}

/** The bot/portal answer for a hold: details plus the student's and the admin's messages. */
export function holdConfirmation(b: any, duplicate: boolean) {
  const price = typeof b.price === 'number' ? `${formatPLN(b.price)}/month` : 'Price on request'
  const deposit = depositText(b.deposit)
  const sharing = SHARING_LABELS[b.sharing] || `${b.sharing} share`
  return {
    ok: true,
    duplicate,
    bookingRef: b.ref,
    name: b.name || '',
    phone: b.phone || b.whatsapp,
    email: b.email || '',
    gender: b.gender ? GENDER_LABELS[b.gender as keyof typeof GENDER_LABELS] : '',
    hostel: b.hostel,
    room: b.room,
    floor: b.floor,
    bed: b.bed,
    price,
    deposit,
    arrivalDate: b.arrivalDate,
    minStay: MIN_STAY,
    minStayAgreed: Boolean(b.minStayAgreed),
    message:
      `✅ Your bed is on hold!\n\n` +
      `Booking ref: ${b.ref}\n` +
      `🏠 ${b.room} — ${b.hostel}\n` +
      `📍 ${b.floor}\n` +
      `🛏 ${b.bed}\n` +
      (b.arrivalDate ? `📅 Arrival: ${b.arrivalDate}\n` : '') +
      `💰 ${price} · 🔒 ${deposit}\n` +
      `👤 ${b.name || '-'} · 📞 +${b.phone || b.whatsapp}\n` +
      (b.email ? `✉️ ${b.email}\n` : '') +
      `\n` +
      `📌 Minimum stay: ${MIN_STAY}\n\n` +
      `We'll keep this bed for you until payment. Our team will contact you with the payment details soon.`,
    adminMessage:
      `🆕 New bed hold (${b.source === 'portal' ? 'student portal' : 'WhatsApp bot'})\n\n` +
      `Ref: ${b.ref}\n` +
      `Name: ${b.name || '-'}\n` +
      (b.gender ? `Gender: ${GENDER_LABELS[b.gender as keyof typeof GENDER_LABELS]}\n` : '') +
      `WhatsApp: +${b.whatsapp}\n` +
      (b.phone && b.phone !== b.whatsapp ? `Call on: +${b.phone}\n` : '') +
      (b.email ? `Email: ${b.email}\n` : '') +
      `Hostel: ${b.hostel}\n` +
      `Room: ${b.room} (${b.floor})\n` +
      `Bed: ${b.bed}\n` +
      `Sharing: ${sharing}\n` +
      `Arrival: ${b.arrivalDate || '-'}\n` +
      `Price: ${price}\n` +
      `${deposit}\n\n` +
      (b.minStayAgreed ? `Agreed to the minimum stay of ${MIN_STAY}.\n` : `Minimum stay agreement: not confirmed\n`) +
      `Bed is marked taken until payment.`,
  }
}
