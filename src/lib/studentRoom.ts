// The room and bed of a student, with the unit's details for the student portal: the bed
// staff assigned, or else the bed of the student's paid booking.
//
// Staff assign a bed on the student's page: the bed's slot in the unit's bedOccupants holds the
// student id, and the student record gets room "Room 203 - Bed B" and property <property name>.
// The occupant slot is the reliable link; the room text is the fallback for older records.

import type { Payload } from 'payload'

import { activeBooking } from './bedHold'
import { defaultFloorBeds, effectiveGenderPolicy, GENDER_POLICY_LABELS, splitOverrideKey, whatsappImageUrl, type BotOverride, type BotProperty } from './botRooms'
import { parseAmount } from './currency'
import { bedDisplayLabel, bedTypeDisplay, defaultAmenities, floorLabel, parseRoomString, RENT_INCLUDES_TEXT, unitDeposit, unitLabel, type Amenity } from './propertyTypes'

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.flat(2).filter((s): s is string => typeof s === 'string' && s.trim() !== '') : [])

/** Property id and bed index of the student's bed, or null when no bed is assigned. */
export function findAssignment(student: any, properties: BotProperty[], overrides: (BotOverride & { bedOccupants?: (string | null)[] })[]) {
  const sid = String(student.id)
  for (const o of overrides) {
    const bedIndex = (o.bedOccupants || []).findIndex((occupant) => occupant != null && String(occupant) === sid)
    if (bedIndex < 0) continue
    const property = properties.find((p) => o.overrideKey.startsWith(`${p.id}-`))
    if (property) return { property, override: o, roomNum: o.overrideKey.slice(String(property.id).length + 1), bedIndex }
  }

  const parsed = parseRoomString(student.room)
  const property = parsed && properties.find((p) => p.name && p.name === student.property)
  if (!parsed || !property) return null
  const bedIndex = /^[A-Z]$/.test(parsed.bed) ? parsed.bed.charCodeAt(0) - 65 : Number(parsed.bed) - 1
  if (!(bedIndex >= 0)) return null
  const override = overrides.find((o) => o.overrideKey === `${property.id}-${parsed.roomNum}`)
  return { property, override, roomNum: parsed.roomNum, bedIndex }
}

/**
 * Where the student lives, from a paid booking when staff haven't assigned a bed by hand:
 * the booked unit and bed (apartment bookings carry the flat bed index too).
 */
export function bookingAssignment(booking: any, properties: BotProperty[], overrides: BotOverride[]) {
  if (!booking?.overrideKey || typeof booking.bedIndex !== 'number') return null
  const { propertyId, roomNum } = splitOverrideKey(booking.overrideKey)
  const property = properties.find((p) => String(p.id) === String(booking.propertyId || propertyId))
  if (!property) return null
  return { property, override: overrides.find((o) => o.overrideKey === booking.overrideKey), roomNum, bedIndex: booking.bedIndex as number }
}

/** The booking details shown with the room: agreed rent and deposit are the booking's. */
const bookingSummary = (b: any) => ({
  ref: b.ref as string,
  status: b.status as string,
  arrivalDate: (b.arrivalDate as string) || '',
  rent: typeof b.price === 'number' ? (b.price as number) : null,
  deposit: typeof b.deposit === 'number' ? (b.deposit as number) : typeof b.price === 'number' ? (b.price as number) : null,
  minStayAgreed: Boolean(b.minStayAgreed),
})

/**
 * The student's room for the portal: the bed staff assigned, else the bed of their paid
 * booking. `room` is null until then; `pending` is a booking still on hold (awaiting payment).
 */
export async function studentRoom(payload: Payload, student: any) {
  const [properties, overrides, booking] = await Promise.all([
    payload.find({ collection: 'v1-properties', pagination: false, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'v1-room-overrides', pagination: false, depth: 0, overrideAccess: true }),
    student.whatsapp ? activeBooking(payload, student.whatsapp) : Promise.resolve(null),
  ])
  const props = properties.docs as unknown as BotProperty[]
  const overs = overrides.docs as unknown as BotOverride[]
  const paid = booking?.status === 'paid' ? booking : null
  const found = findAssignment(student, props, overs) || (paid ? bookingAssignment(paid, props, overs) : null)
  const pending = booking?.status === 'held'
    ? { ref: booking.ref as string, room: booking.room as string, bed: booking.bed as string, hostel: booking.hostel as string, arrivalDate: (booking.arrivalDate as string) || '' }
    : null
  if (!found) return { room: null, pending }
  const { property, override: o, roomNum, bedIndex } = found as { property: BotProperty & { facilities?: string[] }; override?: BotOverride; roomNum: string; bedIndex: number }

  const floor = roomNum.startsWith('S') ? null : Math.floor(Number(roomNum) / 100)
  const unitType = o?.unitType || (floor === null ? 'studio' : 'room')
  const subRooms = unitType === 'apartment' && Array.isArray(o?.subRooms) ? o!.subRooms : []
  const beds =
    unitType === 'apartment' ? subRooms.reduce((sum, r) => sum + (Number(r.beds) || 0), 0) : Number(o?.beds) || (floor ? defaultFloorBeds(property, floor) : 1)
  const amenities: Amenity[] = Array.isArray(o?.amenities) ? o!.amenities : defaultAmenities(unitType)
  const unitImages = [...strings(o?.roomFacilitiesImages), ...(o?.roomFacilitiesList || []).flatMap((f) => strings(f?.images))]
  const bedImage = strings(o?.bedImages?.[bedIndex])[0]
  const rent = parseAmount(o?.roomPrice)
  const deposit = unitDeposit(o)

  const room = {
    hostel: property.name || 'Hostel',
    location: property.location || '',
    facilities: strings(property.facilities),
    unitType: unitLabel(unitType),
    label: o?.roomName?.trim() || `${unitLabel(unitType)} ${roomNum}`,
    roomNum,
    floorName: floor === null ? 'Outside floors' : floorLabel(property, floor),
    bed: bedDisplayLabel({ unitType, subRooms }, bedIndex),
    bedType: bedTypeDisplay(o?.bedTypes, o?.bunkPositions, bedIndex),
    sharing: beds,
    // Agreed at booking when the room comes from a paid booking, else the unit's current amounts
    rent: paid ? bookingSummary(paid).rent ?? rent : rent,
    deposit: paid ? bookingSummary(paid).deposit ?? deposit : deposit,
    rentIncludes: RENT_INCLUDES_TEXT,
    amenities: amenities.filter((a) => a?.included).map((a) => (a.shared ? `${a.name} (shared)` : a.name)),
    genderPolicy: GENDER_POLICY_LABELS[effectiveGenderPolicy(property.genderPolicy, o?.genderPolicy)],
    bedImage: bedImage ? whatsappImageUrl(bedImage) : null,
    images: [...new Set((unitImages.length ? unitImages : strings(property.images)).map(whatsappImageUrl))],
    booking: paid ? bookingSummary(paid) : null,
  }
  return { room, pending }
}
