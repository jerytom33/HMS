// Room availability for the WhatsApp bot. Pure functions over v1-properties and
// v1-room-overrides documents, so the same logic serves the lookup and the booking
// re-check, and can be tested without a database.
//
// Units are derived the same way as the staff properties page: floor rooms come from
// roomsPerFloor (a room has an override document only after staff edit it), units
// outside floors come from standalone overrides. Apartments are bookable per bedroom:
// their beds are a flat list grouped by subRooms, in order (see bedDisplayLabel).

import { formatPLN, parseAmount } from './currency'
import { bedDisplayLabel, floorLabel, roomNumber, unitLabel, type SubRoom } from './propertyTypes'

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
  bedImages?: string[][]
  roomFacilitiesImages?: string[]
  roomFacilitiesList?: { images?: string[]; description?: string }[]
  roomPrice?: string
  deposit?: string
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
  price: number | null
  deposit: number | null
  amenities: string[]
  /** Unit photos, else the hostel's photos; JPEG delivery URLs WhatsApp can show. */
  images: string[]
  hasOwnImages: boolean
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
        deposit: parseAmount(o?.deposit),
        amenities: (o?.amenities || []).filter((a) => a?.included).map((a) => (a.shared ? `${a.name} (shared)` : a.name)),
        images: ownImages.length ? [...new Set(ownImages)] : hostelImages,
        hasOwnImages: ownImages.length > 0,
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
          })
          start += beds
        })
      } else {
        const free = taken.flatMap((t, i) => (t ? [] : [i]))
        units.push({ ...base, unit: slot.key, label: baseLabel, subRoomIndex: null, subRoomName: null, sharing: total, freeBeds: free.length, freeBedIndices: free })
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
    `💰 ${priceText(u)}`,
  ]
  if (u.amenities.length) lines.push(`✅ ${u.amenities.join(', ')}`)
  return lines.join('\n')
}

/** WhatsApp list limits: 10 rows, 24-char titles, 72-char descriptions. */
export const LIST_LIMIT = 10

export type RoomSearch = ReturnType<typeof searchRooms>

/**
 * Units with a free bed for a sharing type. With more than 10 matches and no hostel
 * chosen, returns the hostels to pick from instead of rooms (needsHostel).
 */
export function searchRooms(units: BotUnit[], sharing: number, hostelId?: string | null) {
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
      title: clip(u.label, 24),
      description: clip(`${u.hostel} · ${u.floorName} · ${u.freeBeds} free · ${priceText(u)}`, 72),
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
