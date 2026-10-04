// Room availability for the WhatsApp bot. Pure functions over v1-properties and
// v1-room-overrides documents, so the same logic serves the lookup and the booking
// re-check, and can be tested without a database.
//
// Units are derived the same way as the staff properties page: floor rooms come from
// roomsPerFloor (a room has an override document only after staff edit it), units
// outside floors come from standalone overrides. Apartments are bookable per bedroom:
// their beds are a flat list grouped by subRooms, in order (see bedDisplayLabel).

import { formatPLN, parseAmount } from './currency'
import { bedDisplayLabel, bedTypeDisplay, floorLabel, roomNumber, unitDeposit, unitLabel, type SubRoom } from './propertyTypes'

export type BotProperty = {
  id: string
  name?: string
  location?: string
  rooms?: number
  floors?: number
  roomsPerFloor?: number[]
  isCustomBedsPerFloor?: boolean
  bedsPerFloor?: number[]
  beds?: number
  floorNames?: string[]
  images?: string[]
  /** 'mixed' | 'male' | 'female' (missing = mixed) */
  genderPolicy?: string
}

export type BotOverride = {
  overrideKey: string
  roomName?: string
  unitType?: string
  subRooms?: SubRoom[]
  amenities?: { name: string; included: boolean; shared?: boolean }[]
  standalone?: boolean
  status?: string
  beds?: number
  freeBeds?: number
  filledBeds?: number
  bedStatuses?: boolean[]
  /** Per bed: 'independent' | 'bunk' */
  bedTypes?: string[]
  /** Per bed: 'lower' | 'upper' for bunk beds */
  bunkPositions?: (string | null)[]
  bedImages?: string[][]
  roomFacilitiesImages?: string[]
  roomFacilitiesList?: { images?: string[]; description?: string }[]
  roomPrice?: string
  deposit?: string
  /** 'inherit' | 'mixed' | 'male' | 'female' (missing = inherit from the property) */
  genderPolicy?: string
}

/** One bookable choice: a room or studio, or one bedroom of an apartment. */
export type BotUnit = {
  /** Stable id for the bot: overrideKey, plus "~<bedroom index>" for apartment bedrooms. */
  unit: string
  overrideKey: string
  propertyId: string
  hostel: string
  location: string
  roomNum: string
  /** 1-based floor number, or null for units outside floors. */
  floor: number | null
  floorName: string
  unitType: 'room' | 'studio' | 'apartment'
  /** "Room 202", "Studio 3", "Apartment 101 · Bedroom 2". */
  label: string
  subRoomIndex: number | null
  subRoomName: string | null
  /** Beds in the room (or bedroom): the sharing type. */
  sharing: number
  freeBeds: number
  /** Flat bed indices of this unit that are free. */
  freeBedIndices: number[]
  /** The free beds with their labels ("Bed B", "Bedroom 2 · Bed A"), type ("Bunk Bed · Upper") and photo, if any. */
  freeBedList: { index: number; label: string; type: string; image: string | null }[]
  price: number | null
  deposit: number | null
  amenities: string[]
  /** Unit photos, else the hostel's photos; JPEG delivery URLs WhatsApp can show. */
  images: string[]
  hasOwnImages: boolean
  /** Who may stay: the unit's own setting, else the property's */
  genderPolicy: GenderPolicy
}

export const SHARING_LABELS: Record<number, string> = { 1: 'Single share', 2: 'Two share', 3: 'Three share', 4: 'Four share' }

/** "Two share", "two", "2", "2 beds" -> 2. Returns null when no sharing is recognised. */
export function parseSharing(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null
  const text = String(input).trim().toLowerCase()
  const digit = text.match(/\d+/)
  if (digit) {
    const n = Number(digit[0])
    return n > 0 && n <= 20 ? n : null
  }
  const words: Record<string, number> = { single: 1, one: 1, two: 2, double: 2, three: 3, triple: 3, four: 4 }
  for (const [word, n] of Object.entries(words)) if (new RegExp(`\\b${word}\\b`).test(text)) return n
  return null
}

/**
 * WhatsApp shows JPEG/PNG only. Cloudinary URLs are stored with f_auto (which may
 * serve WebP/AVIF/HEIC), so ask Cloudinary for a JPEG instead.
 */
export function whatsappImageUrl(url: string): string {
  if (!url || !url.startsWith('https://res.cloudinary.com/')) return url
  const marker = '/image/upload/'
  const i = url.indexOf(marker)
  if (i === -1) return url
  const rest = url.slice(i + marker.length).replace(/^f_auto,q_auto\//, '')
  return `${url.slice(0, i + marker.length)}f_jpg,q_auto,w_1280,c_limit/${rest}`
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.flat(2).filter((s): s is string => typeof s === 'string' && s.trim() !== '') : [])

/** Bed taken flags, fitted to the unit's bed count. Missing statuses fall back to filledBeds. */
export function fitBedStatuses(override: BotOverride | undefined, total: number): boolean[] {
  const stored = Array.isArray(override?.bedStatuses) ? override!.bedStatuses : null
  if (stored) return Array.from({ length: total }, (_, i) => Boolean(stored[i]))
  const filled = override?.status === 'occupied' ? total : Number(override?.filledBeds) || 0
  return Array.from({ length: total }, (_, i) => i < filled)
}

/** Beds a floor room has before staff edit it (same rule as the staff page). */
export function defaultFloorBeds(property: BotProperty, floor: number): number {
  if (property.isCustomBedsPerFloor && (property.bedsPerFloor?.length || 0) >= floor) {
    return Number(property.bedsPerFloor![floor - 1]) || 2
  }
  return Number(property.beds) || 2
}

function roomsOnFloor(property: BotProperty, floor: number): number {
  if (Array.isArray(property.roomsPerFloor) && property.roomsPerFloor.length >= floor) {
    return Number(property.roomsPerFloor[floor - 1]) || 0
  }
  const total = Number(property.rooms) || 0
  const floors = Number(property.floors) || 1
  const base = Math.floor(total / floors)
  return floor <= total % floors ? base + 1 : base
}

/** Units of every property, one entry per room/studio and per apartment bedroom. */
export function listUnits(properties: BotProperty[], overrides: BotOverride[]): BotUnit[] {
  const byKey = new Map(overrides.map((o) => [o.overrideKey, o]))
  const units: BotUnit[] = []

  for (const property of properties) {
    const pid = String(property.id)
    const hostelImages = strings(property.images).map(whatsappImageUrl)
    const slots: { key: string; roomNum: string; floor: number | null; defaultBeds: number }[] = []

    const floors = Math.max(Number(property.floors) || 1, 1)
    for (let floor = 1; floor <= floors; floor++) {
      const count = roomsOnFloor(property, floor)
      for (let i = 0; i < count; i++) {
        const roomNum = String(roomNumber(floor, i))
        slots.push({ key: `${pid}-${roomNum}`, roomNum, floor, defaultBeds: defaultFloorBeds(property, floor) })
      }
    }
    for (const o of overrides) {
      if (o.standalone && o.overrideKey.startsWith(`${pid}-S`)) {
        slots.push({ key: o.overrideKey, roomNum: o.overrideKey.slice(pid.length + 1), floor: null, defaultBeds: 1 })
      }
    }

    for (const slot of slots) {
      const o = byKey.get(slot.key)
      const status = o?.status || 'available'
      if (status === 'maintenance') continue

      const unitType = (o?.unitType || (slot.floor === null ? 'studio' : 'room')) as BotUnit['unitType']
      const subRooms = unitType === 'apartment' && Array.isArray(o?.subRooms) ? o!.subRooms : []
      const total =
        unitType === 'apartment'
          ? subRooms.reduce((sum, r) => sum + (Number(r.beds) || 0), 0)
          : Number(o?.beds) || slot.defaultBeds
      if (total <= 0) continue

      const taken = fitBedStatuses(o, total)
      const bedInfo = (b: number) => {
        const photo = strings(o?.bedImages?.[b])[0]
        // An apartment bedroom's label already names the bedroom, so keep just "Bed A"
        const label = bedDisplayLabel({ unitType, subRooms }, b).split(' · ').pop()!
        return { index: b, label, type: bedTypeDisplay(o?.bedTypes, o?.bunkPositions, b), image: photo ? whatsappImageUrl(photo) : null }
      }
      const ownImages = [...strings(o?.roomFacilitiesImages), ...strings(o?.bedImages), ...(o?.roomFacilitiesList || []).flatMap((f) => strings(f?.images))].map(whatsappImageUrl)
      const baseLabel = o?.roomName?.trim() || `${unitLabel(unitType)} ${slot.roomNum}`
      const base = {
        overrideKey: slot.key,
        propertyId: pid,
        hostel: property.name || 'Hostel',
        location: property.location || '',
        roomNum: slot.roomNum,
        floor: slot.floor,
        floorName: slot.floor === null ? 'Outside floors' : floorLabel(property, slot.floor),
        unitType,
        price: parseAmount(o?.roomPrice),
        deposit: unitDeposit(o),
        amenities: (o?.amenities || []).filter((a) => a?.included).map((a) => (a.shared ? `${a.name} (shared)` : a.name)),
        images: ownImages.length ? [...new Set(ownImages)] : hostelImages,
        hasOwnImages: ownImages.length > 0,
        genderPolicy: effectiveGenderPolicy(property.genderPolicy, o?.genderPolicy),
      }

      if (unitType === 'apartment' && subRooms.length) {
        let start = 0
        subRooms.forEach((room, index) => {
          const beds = Number(room.beds) || 0
          const free = []
          for (let b = start; b < start + beds; b++) if (!taken[b]) free.push(b)
          units.push({
            ...base,
            unit: `${slot.key}~${index}`,
            label: `${baseLabel} · ${room.name || `Bedroom ${index + 1}`}`,
            subRoomIndex: index,
            subRoomName: room.name || `Bedroom ${index + 1}`,
            sharing: beds,
            freeBeds: free.length,
            freeBedIndices: free,
            freeBedList: free.map(bedInfo),
          })
          start += beds
        })
      } else {
        const free = taken.flatMap((t, i) => (t ? [] : [i]))
        units.push({ ...base, unit: slot.key, label: baseLabel, subRoomIndex: null, subRoomName: null, sharing: total, freeBeds: free.length, freeBedIndices: free, freeBedList: free.map(bedInfo) })
      }
    }
  }
  return units
}

/** Bed label for a booked bed, e.g. "Bedroom 2 · Bed A" or "Bed B". */
export const bookedBedLabel = (unitType: string, subRooms: SubRoom[] | undefined, index: number) =>
  bedDisplayLabel({ unitType, subRooms }, index)

const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`)

const priceText = (u: BotUnit) => (u.price !== null ? `${formatPLN(u.price)}/month` : 'Price on request')

export const depositText = (deposit: number | null | undefined) =>
  typeof deposit === 'number' ? `Deposit ${formatPLN(deposit)}` : 'Deposit on request'

/** "💰 870 PLN/month · 🔒 Deposit 1000 PLN" */
const moneyLine = (u: BotUnit) => `💰 ${priceText(u)} · 🔒 ${depositText(u.deposit)}`

const sortUnits = (a: BotUnit, b: BotUnit) =>
  a.hostel.localeCompare(b.hostel) ||
  (a.floor ?? 999) - (b.floor ?? 999) ||
  a.roomNum.localeCompare(b.roomNum, undefined, { numeric: true }) ||
  (a.subRoomIndex ?? 0) - (b.subRoomIndex ?? 0)

/** Photo caption with the unit's details. */
export function unitCaption(u: BotUnit): string {
  const kind = u.unitType === 'apartment' ? `Bedroom in an apartment` : unitLabel(u.unitType)
  const lines = [
    `🏠 ${u.label} — ${u.hostel}`,
    `📍 ${[u.location, u.floorName].filter(Boolean).join(' · ')}`,
    `🛏 ${kind}, ${u.sharing} ${u.sharing === 1 ? 'bed' : 'beds'} · ${u.freeBeds} free`,
    moneyLine(u),
  ]
  if (u.amenities.length) lines.push(`✅ ${u.amenities.join(', ')}`)
  return lines.join('\n')
}

/** WhatsApp list limits: 10 rows, 24-char titles, 72-char descriptions. */
export const LIST_LIMIT = 10

// The bot platform saves a list answer as the row's title, not its value, so every
// list title must lead back to one hostel, room or bed (see resolveUnit / resolveBed).
const norm = (text: unknown) => String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

/** List title for a room; names the hostel too when another room of the same sharing has the same name. */
export function roomTitle(u: BotUnit, units: BotUnit[]): string {
  const title = clip(u.label, 24)
  const clash = units.some((x) => x !== u && x.sharing === u.sharing && clip(x.label, 24) === title)
  return clash ? clip(`${u.label} · ${u.hostel}`, 24) : title
}

/** A hostel's id from its id or its name (as the hostel list saves it). */
export function resolveHostelId(units: BotUnit[], input: unknown): string | null {
  const wanted = norm(input)
  if (!wanted) return null
  const byId = units.find((u) => u.propertyId === String(input).trim())
  if (byId) return byId.propertyId
  const byName = units.find((u) => norm(u.hostel) === wanted || norm(clip(u.hostel, 24)) === wanted)
  return byName ? byName.propertyId : null
}

export const AMBIGUOUS_ROOM_MESSAGE = "Sorry, I couldn't tell which room you meant 🙏 Please choose the room again."

/**
 * The unit a student picked, from its id or from the room list title ("Room 402",
 * "Room 101 · Bernerowo"). `sharing` and `hostel` narrow the search to the list they saw.
 * When a title still matches more than one unit, `ambiguous` is true and no unit is
 * returned: guessing could book a room in the wrong hostel.
 */
export function findUnit(
  units: BotUnit[],
  input: unknown,
  opts: { sharing?: number | null; hostel?: unknown } = {},
): { unit?: BotUnit; ambiguous: boolean } {
  const raw = String(input ?? '').trim()
  if (!raw) return { ambiguous: false }
  const byId = units.find((u) => u.unit === raw)
  if (byId) return { unit: byId, ambiguous: false }
  const hostelId = resolveHostelId(units, opts.hostel)
  const wanted = norm(raw)
  const matches = units.filter(
    (u) =>
      (!opts.sharing || u.sharing === opts.sharing) &&
      (!hostelId || u.propertyId === hostelId) &&
      (norm(roomTitle(u, units)) === wanted || norm(u.label) === wanted),
  )
  if (matches.length > 1) return { ambiguous: true }
  return { unit: matches[0], ambiguous: false }
}

/** The unit a student picked (see findUnit); undefined when not found or ambiguous. */
export function resolveUnit(units: BotUnit[], input: unknown, opts: { sharing?: number | null; hostel?: unknown } = {}): BotUnit | undefined {
  return findUnit(units, input, opts).unit
}

/** A bed's flat index from its index or its list title ("Bed B"); null when it is not one of the free beds. */
export function resolveBed(u: BotUnit, input: unknown): number | null {
  const raw = String(input ?? '').trim()
  if (/^\d+$/.test(raw)) return Number(raw)
  const wanted = norm(raw)
  const bed = u.freeBedList.find((b) => norm(b.label) === wanted || norm(clip(b.label, 24)) === wanted)
  return bed ? bed.index : null
}

export type RoomSearch = ReturnType<typeof searchRooms>

/**
 * Units with a free bed for a sharing type. With more than 10 matches and no hostel
 * chosen, returns the hostels to pick from instead of rooms (needsHostel).
 */
export function searchRooms(units: BotUnit[], sharing: number, hostel?: string | null, gender?: StudentGender | null) {
  // With a gender, only units that gender may stay in (see allowedForGender)
  if (gender !== undefined) units = units.filter((u) => allowedForGender(u.genderPolicy, gender))
  const hostelId = resolveHostelId(units, hostel)
  const matching = units.filter((u) => u.sharing === sharing && u.freeBeds > 0).sort(sortUnits)
  const inHostel = hostelId ? matching.filter((u) => u.propertyId === hostelId) : matching

  const hostelCounts = new Map<string, { id: string; name: string; location: string; count: number }>()
  for (const u of matching) {
    const h = hostelCounts.get(u.propertyId) || { id: u.propertyId, name: u.hostel, location: u.location, count: 0 }
    h.count++
    hostelCounts.set(u.propertyId, h)
  }
  const hostels = [...hostelCounts.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, LIST_LIMIT).map((h) => ({
    value: h.id,
    title: clip(h.name, 24),
    description: clip(`${h.count} ${h.count === 1 ? 'room' : 'rooms'} available${h.location ? ` · ${h.location}` : ''}`, 72),
  }))

  const needsHostel = !hostelId && matching.length > LIST_LIMIT && hostels.length > 1
  const shown = needsHostel ? [] : inHostel.slice(0, LIST_LIMIT)

  const otherCounts = new Map<number, number>()
  for (const u of units) if (u.freeBeds > 0 && u.sharing !== sharing) otherCounts.set(u.sharing, (otherCounts.get(u.sharing) || 0) + 1)
  const otherSharing = [...otherCounts.entries()].sort((a, b) => a[0] - b[0]).map(([n, count]) => ({ sharing: n, label: SHARING_LABELS[n] || `${n} share`, count }))

  const sharingLabel = SHARING_LABELS[sharing] || `${sharing} share`
  let status: 'rooms' | 'choose_hostel' | 'choose_other_sharing' | 'not_available'
  if (needsHostel) status = 'choose_hostel'
  else if (shown.length) status = 'rooms'
  else if (otherSharing.length) status = 'choose_other_sharing'
  else status = 'not_available'

  const messages = {
    rooms: `Here ${shown.length === 1 ? 'is the room' : `are ${shown.length} rooms`} available for ${sharingLabel.toLowerCase()} 👇`,
    choose_hostel: `We have ${matching.length} rooms for ${sharingLabel.toLowerCase()} in ${hostelCounts.size} hostels. Which hostel would you like to see?`,
    choose_other_sharing: `Sorry, ${sharingLabel.toLowerCase()} is fully booked right now 😔\n\nAvailable now: ${otherSharing.map((o) => o.label).join(', ')}. Please choose another option.`,
    not_available: `Sorry, all our rooms are fully booked right now 😔 We'll let you know when a bed becomes free.`,
  }

  return {
    status,
    sharing,
    sharingLabel,
    total: matching.length,
    count: shown.length,
    needsHostel,
    message: messages[status],
    hostels,
    /** Rows for a dynamic WhatsApp list: title / description / value. */
    rooms: shown.map((u) => ({
      value: u.unit,
      title: roomTitle(u, units),
      description: clip(`${u.hostel} · ${u.floorName} · ${u.freeBeds} free · ${priceText(u)} · ${depositText(u.deposit)}`, 72),
      hostel: u.hostel,
      floor: u.floorName,
      unitType: u.unitType,
      freeBeds: u.freeBeds,
      price: u.price,
      image: u.images[0] || null,
      caption: unitCaption(u),
    })),
    /** Photos for the Multiple Image block: one per unit that has a photo. */
    gallery: shown.filter((u) => u.images.length).map((u) => ({ image: u.images[0], caption: unitCaption(u) })),
    /** All shown units as one text message, for units without photos. */
    summaryText: shown.map((u, i) => `${i + 1}. ${unitCaption(u)}`).join('\n\n'),
    otherSharing: otherSharing.map((o) => ({ value: String(o.sharing), title: o.label, description: `${o.count} ${o.count === 1 ? 'room' : 'rooms'} available` })),
  }
}

/**
 * One unit's details and its free beds, for the bed choice and the booking summary.
 * `unitInput` is the unit id or the room list title (with `context` = the list's sharing
 * and hostel). With `bed` (a bed index or the bed list title), `available` says whether
 * that bed is still free and the summary names it; without, whether the unit has any free bed.
 */
export function unitDetails(
  units: BotUnit[],
  unitInput: string,
  bed?: string | number | null,
  context: { sharing?: number | null; hostel?: unknown } = {},
) {
  const found = findUnit(units, unitInput, context)
  if (found.ambiguous) {
    return {
      available: false,
      unit: unitInput,
      reason: 'ambiguous_room',
      message: AMBIGUOUS_ROOM_MESSAGE,
      beds: [] as { value: string; title: string; description: string; bedType: string }[],
    }
  }
  const u = found.unit
  const bedGiven = !(bed === undefined || bed === null || String(bed).trim() === '')
  if (!u || u.freeBeds === 0) {
    return {
      available: false,
      unit: u?.unit || unitInput,
      reason: 'room_full',
      message: 'Sorry, all beds in that room were just booked 😔 Let me show you the rooms that are still free.',
      beds: [] as { value: string; title: string; description: string; bedType: string }[],
    }
  }
  const beds = u.freeBedList.map((b) => ({
    value: String(b.index),
    title: clip(b.label, 24),
    description: clip(`${b.type} · ${priceText(u)} · ${depositText(u.deposit)}`, 72),
    bedType: b.type,
  }))
  const base = {
    unit: u.unit,
    label: u.label,
    hostel: u.hostel,
    floor: u.floorName,
    location: u.location,
    sharing: u.sharing,
    freeBeds: u.freeBeds,
    bedCount: u.sharing,
    price: priceText(u),
    deposit: depositText(u.deposit),
    image: u.images[0] || null,
    caption: unitCaption(u),
    /** Rows for a dynamic WhatsApp list of the free beds: title / description / value. */
    beds,
    bedsText: `${u.freeBeds} of ${u.sharing} ${u.sharing === 1 ? 'bed' : 'beds'} free`,
    /** Photos of the free beds that have one, for a Multiple Image block before the bed list. */
    bedGallery: u.freeBedList.filter((b) => b.image).map((b) => ({
      image: b.image as string,
      caption: `🛏 ${b.label} (${b.type}) — ${u.label}, ${u.hostel}\n${moneyLine(u)}`,
    })),
    hasBedPhotos: u.freeBedList.some((b) => b.image),
  }
  if (!bedGiven) {
    return { ...base, available: true, summary: `${u.label} — ${u.hostel}, ${u.floorName}\n${moneyLine(u)}` }
  }
  const wantedBed = resolveBed(u, bed)
  const chosen = u.freeBedList.find((b) => b.index === wantedBed)
  if (!chosen) {
    return {
      ...base,
      available: false,
      reason: 'bed_taken',
      message: 'Sorry, that bed was just booked by someone else 😔 Please choose another bed.',
    }
  }
  return {
    ...base,
    available: true,
    bed: chosen.index,
    bedLabel: chosen.label,
    /** "Independent Bed", "Bunk Bed · Upper" */
    bedType: chosen.type,
    bedImage: chosen.image,
    /** "Room 202, Bed B — Bukowiecka 11, 1st Floor · 870 PLN/month" */
    summary: `${u.label}, ${chosen.label} — ${u.hostel}, ${u.floorName}\n${moneyLine(u)}`,
  }
}

/**
 * A phone number a student typed: digits only, with a leading + or 00 dropped.
 * Returns null unless it has 8–15 digits (E.164 length).
 */
export function parseContactPhone(input: unknown): string | null {
  const digits = String(input ?? '').trim().replace(/^00/, '').replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15 ? digits : null
}

/** An email address a student typed, lower-cased; null unless it looks like one. */
export function parseEmail(input: unknown): string | null {
  const text = String(input ?? '').trim().toLowerCase()
  return text.length <= 254 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(text) ? text : null
}

/**
 * Whether the student agreed: true, "true", "yes", "y", "1", "agree", "agreed", "I agree"
 * (any case, as a bot platform may send the button text). Anything else is false.
 */
export function parseAgreement(input: unknown): boolean {
  if (input === true) return true
  return /^(true|yes|y|1|agree|agreed|i agree|ok|okay)$/.test(String(input ?? '').trim().toLowerCase())
}

/** "Male", "female", "F", "Other" -> 'male' | 'female' | 'other'; null when not recognised. */
export function parseGender(input: unknown): 'male' | 'female' | 'other' | null {
  const text = String(input ?? '').trim().toLowerCase()
  if (/^(m|male|man|boy)$/.test(text)) return 'male'
  if (/^(f|female|woman|girl)$/.test(text)) return 'female'
  if (/^(o|other|others|prefer not to say)$/.test(text)) return 'other'
  return null
}

export const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other' } as const

export type StudentGender = 'male' | 'female' | 'other'
export type GenderPolicy = 'mixed' | 'male' | 'female'

export const GENDER_POLICY_LABELS: Record<GenderPolicy, string> = { mixed: 'Mixed', male: 'Male only', female: 'Female only' }

const asPolicy = (value: unknown): GenderPolicy | null => (value === 'male' || value === 'female' || value === 'mixed' ? value : null)

/** Who may stay in a unit: its own setting unless 'inherit'/missing, else the property's; mixed by default. */
export function effectiveGenderPolicy(propertyPolicy: unknown, unitPolicy: unknown): GenderPolicy {
  return asPolicy(unitPolicy) || asPolicy(propertyPolicy) || 'mixed'
}

/**
 * Whether a student may stay in a unit. Mixed units are open to everyone; male-only and
 * female-only units only to that gender, so a student whose gender is unknown or 'other'
 * sees mixed units only.
 */
export function allowedForGender(policy: GenderPolicy, gender: StudentGender | null): boolean {
  return policy === 'mixed' || policy === gender
}

export function genderNotAllowedMessage(policy: GenderPolicy): string {
  return `Sorry, that room is for ${policy === 'female' ? 'female' : 'male'} students only. Please choose another room.`
}

/** "6ac0…-101~1" -> { overrideKey: "6ac0…-101", subRoomIndex: 1 }. */
export function parseUnitId(unit: string): { overrideKey: string; subRoomIndex: number | null } {
  const [overrideKey, sub] = String(unit || '').split('~')
  return { overrideKey, subRoomIndex: sub !== undefined && /^\d+$/.test(sub) ? Number(sub) : null }
}

/** Property id and room number from an override key ("<propertyId>-<roomNum>"). */
export function splitOverrideKey(overrideKey: string): { propertyId: string; roomNum: string } {
  const i = overrideKey.lastIndexOf('-')
  return { propertyId: overrideKey.slice(0, i), roomNum: overrideKey.slice(i + 1) }
}
