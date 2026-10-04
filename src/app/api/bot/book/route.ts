import { randomInt } from 'crypto'
import { NextResponse } from 'next/server'
import type { Payload } from 'payload'

import { formatPLN } from '@/lib/currency'
import { OVERRIDES, syncCounts, unitBedTotal } from '@/lib/botHolds'
import { bookedBedLabel, depositText, fitBedStatuses, GENDER_LABELS, parseContactPhone, parseGender, SHARING_LABELS, splitOverrideKey, type BotOverride, type BotUnit } from '@/lib/botRooms'
import { botPayload, checkBotKey, clean, loadInventory, normalizePhone } from '@/lib/botServer'
import { defaultAmenities } from '@/lib/propertyTypes'

export const dynamic = 'force-dynamic'

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

/**
 * POST /api/bot/book   Header: x-api-key: <BOT_API_KEY>
 * Body: { unit, bed?, name, whatsapp, arrivalDate, phone?, gender? }  (unit = a `value` from /api/bot/rooms)
 * `bed` is the flat bed index the student chose (a `value` from /api/bot/unit `beds`); without it
 * the first free bed is held. `phone` is the number to call; defaults to the WhatsApp number.
 *
 * Holds one free bed in the unit until payment: the bed is marked taken in
 * v1-room-overrides (atomically, so two students can't get the same bed) and a
 * v1-bot-bookings record is created. Always answers 200 with `ok` for the bot to branch on.
 */
export async function POST(request: Request) {
  const denied = checkBotKey(request)
  if (denied) return denied

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_request', error: 'JSON body required' }, { status: 400 })
  }
  const unitId = clean(body.unit)
  const whatsapp = normalizePhone(body.whatsapp)
  const name = clean(body.name, 120)
  const arrivalDate = clean(body.arrivalDate, 40)
  const phone = parseContactPhone(body.phone) || whatsapp
  const gender = parseGender(body.gender)
  const bedText = clean(body.bed, 10)
  const wantedBed = /^\d+$/.test(bedText) ? Number(bedText) : null
  if (!unitId || !whatsapp) {
    return NextResponse.json({ ok: false, reason: 'bad_request', error: 'unit and whatsapp are required' }, { status: 400 })
  }

  try {
    const payload = await botPayload()

    // A double tap or retry within 30 minutes returns the same hold (for the same bed, when one was chosen)
    const recent = await payload.find({
      collection: 'v1-bot-bookings',
      overrideAccess: true,
      limit: 1,
      where: {
        whatsapp: { equals: whatsapp },
        unit: { equals: unitId },
        ...(wantedBed !== null ? { bedIndex: { equals: wantedBed } } : {}),
        status: { equals: 'held' },
        createdAt: { greater_than: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
      },
    })
    if (recent.docs[0]) return NextResponse.json(confirmation(recent.docs[0] as any, true))

    const { overrides, units } = await loadInventory(payload)
    const unit = units.find((u) => u.unit === unitId)
    if (!unit) {
      return NextResponse.json({ ok: false, reason: 'unit_not_found', message: 'Sorry, that room is no longer available. Please choose another one.' })
    }
    const noBeds = {
      ok: false,
      reason: 'no_free_beds',
      message: 'Sorry, the last bed in that room was just taken 😔 Please choose another room.',
    }
    if (!unit.freeBedIndices.length) return NextResponse.json(noBeds)
    const bedTaken = {
      ok: false,
      reason: 'bed_taken',
      message: 'Sorry, that bed was just booked by someone else 😔 Please choose another bed.',
    }
    if (wantedBed !== null && !unit.freeBedIndices.includes(wantedBed)) return NextResponse.json(bedTaken)

    const existing = overrides.find((o) => o.overrideKey === unit.overrideKey)
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
    if (!claimed) return NextResponse.json(wantedBed !== null ? bedTaken : noBeds)
    await syncCounts(Model, claimed.doc)

    const { roomNum } = splitOverrideKey(unit.overrideKey)
    const bed = bookedBedLabel(unit.unitType, claimed.doc.subRooms, claimed.bedIndex)
    let booking: any = null
    for (let attempt = 0; attempt < 3 && !booking; attempt++) {
      try {
        booking = await payload.create({
          collection: 'v1-bot-bookings',
          overrideAccess: true,
          data: {
            ref: newRef(),
            type: 'bed_hold',
            status: 'held',
            name,
            whatsapp,
            phone,
            gender: gender ?? undefined,
            arrivalDate,
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

    return NextResponse.json(confirmation(booking, false))
  } catch (error) {
    console.error('Bot booking API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again or tap "Request a call".' }, { status: 500 })
  }
}

function confirmation(b: any, duplicate: boolean) {
  const price = typeof b.price === 'number' ? `${formatPLN(b.price)}/month` : 'Price on request'
  const deposit = depositText(b.deposit)
  const sharing = SHARING_LABELS[b.sharing] || `${b.sharing} share`
  return {
    ok: true,
    duplicate,
    bookingRef: b.ref,
    name: b.name || '',
    phone: b.phone || b.whatsapp,
    gender: b.gender ? GENDER_LABELS[b.gender as keyof typeof GENDER_LABELS] : '',
    hostel: b.hostel,
    room: b.room,
    floor: b.floor,
    bed: b.bed,
    price,
    deposit,
    arrivalDate: b.arrivalDate,
    message:
      `✅ Your bed is on hold!\n\n` +
      `Booking ref: ${b.ref}\n` +
      `🏠 ${b.room} — ${b.hostel}\n` +
      `📍 ${b.floor}\n` +
      `🛏 ${b.bed}\n` +
      (b.arrivalDate ? `📅 Arrival: ${b.arrivalDate}\n` : '') +
      `💰 ${price} · 🔒 ${deposit}\n` +
      `👤 ${b.name || '-'} · 📞 +${b.phone || b.whatsapp}\n\n` +
      `We'll keep this bed for you until payment. Our team will contact you with the payment details soon.`,
    adminMessage:
      `🆕 New bed hold (WhatsApp bot)\n\n` +
      `Ref: ${b.ref}\n` +
      `Name: ${b.name || '-'}\n` +
      (b.gender ? `Gender: ${GENDER_LABELS[b.gender as keyof typeof GENDER_LABELS]}\n` : '') +
      `WhatsApp: +${b.whatsapp}\n` +
      (b.phone && b.phone !== b.whatsapp ? `Call on: +${b.phone}\n` : '') +
      `Hostel: ${b.hostel}\n` +
      `Room: ${b.room} (${b.floor})\n` +
      `Bed: ${b.bed}\n` +
      `Sharing: ${sharing}\n` +
      `Arrival: ${b.arrivalDate || '-'}\n` +
      `Price: ${price}\n` +
      `${deposit}\n\n` +
      `Bed is marked taken until payment.`,
  }
}
