// Units inside a property. A property mixes rooms, studios and apartments,
// on floors or (studios/apartments only) outside any floor.

export type UnitType = 'room' | 'studio' | 'apartment'

export type Amenity = { name: string; included: boolean; shared?: boolean }

export type SubRoom = { name: string; beds: number }

export const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: 'room', label: 'Room' },
  { value: 'studio', label: 'Studio' },
  { value: 'apartment', label: 'Apartment' },
]

/** Unit types allowed outside floors. */
export const STANDALONE_UNIT_TYPES = UNIT_TYPES.filter((t) => t.value !== 'room')

/** Display name of a unit type, e.g. "Studio". */
export const unitLabel = (type?: string) => UNIT_TYPES.find((t) => t.value === type)?.label || 'Room'

/** Default amenities per unit type; staff can edit them per unit. */
export const defaultAmenities = (type?: string): Amenity[] => {
  switch (type) {
    case 'studio':
      return [
        { name: 'Kitchen', included: true, shared: false },
        { name: 'Toilet', included: true, shared: false },
        { name: 'WiFi', included: true },
      ]
    case 'apartment':
      return [
        { name: 'Kitchen', included: true, shared: false },
        { name: 'Washroom', included: true, shared: false },
        { name: 'Washing Machine', included: true },
        { name: 'WiFi', included: true },
      ]
    default:
      return [
        { name: 'Kitchen', included: true, shared: true },
        { name: 'Washroom / Toilet', included: true, shared: true },
        { name: 'WiFi', included: true },
      ]
  }
}

/** Default rooms inside a new apartment. */
export const defaultSubRooms = (): SubRoom[] => [{ name: 'Bedroom 1', beds: 1 }]

/** Total beds in a unit; an apartment's beds are the sum of its rooms. */
export const unitBedCount = (unit?: { unitType?: string; beds?: number; subRooms?: SubRoom[] }) =>
  unit?.unitType === 'apartment'
    ? (unit.subRooms || []).reduce((sum, r) => sum + (Number(r.beds) || 0), 0)
    : Number(unit?.beds) || 0

const letter = (i: number) => String.fromCharCode(65 + i)

/**
 * Display label for the bed at a flat index. Apartment beds are grouped per room
 * ("Bedroom 1 · Bed A"); other units use "Bed A".
 */
export const bedDisplayLabel = (unit: { unitType?: string; subRooms?: SubRoom[] } | undefined, index: number) => {
  if (unit?.unitType === 'apartment' && unit.subRooms?.length) {
    let start = 0
    for (const room of unit.subRooms) {
      const beds = Number(room.beds) || 0
      if (index < start + beds) return `${room.name || 'Room'} · Bed ${letter(index - start)}`
      start += beds
    }
  }
  return `Bed ${letter(index)}`
}

const ordinal = (n: number) => {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'}`
}

/** Default floor name: floor 1 is "Ground Floor", floor 2 "1st Floor", ... */
export const defaultFloorName = (floor: number | string) => {
  const n = Number(floor)
  return n <= 1 ? 'Ground Floor' : `${ordinal(n - 1)} Floor`
}

/** Pad or trim floor names to match the floor count. */
export const fitFloorNames = (names: string[] | undefined, floors: number) =>
  Array.from({ length: Math.max(floors, 1) }, (_, i) => names?.[i] || '')

/** Room number for the nth unit (0-based) on a floor: floor 2, index 0 -> 201. */
export const roomNumber = (floor: number | string, index: number) => Number(floor) * 100 + index + 1

/** Floor label: custom name if set, otherwise the default ("Ground Floor", "1st Floor"...). */
export const floorLabel = (property: any, floor: number | string) =>
  property?.floorNames?.[Number(floor) - 1] || defaultFloorName(floor)

/** Override key of a unit outside floors: `${propertyId}-S${n}`. */
export const standaloneKey = (propertyId: string | number, n: number) => `${propertyId}-S${n}`

export const isStandaloneKey = (propertyId: string | number, key: string) => key.startsWith(`${propertyId}-S`)

/** Unit label: custom name if set, otherwise "<Type> <number>". */
export const roomLabel = (
  _property: any,
  roomNum: number | string,
  override?: { roomName?: string; unitType?: string },
) => override?.roomName || `${unitLabel(override?.unitType)} ${roomNum}`

/** Unit numbers ("S1", "S2", ...) of a property's units outside floors, in order. */
export const standaloneRoomNums = (overrides: Record<string, any>, propertyId: string | number) =>
  Object.keys(overrides)
    .filter((key) => isStandaloneKey(propertyId, key) && overrides[key]?.standalone)
    .map((key) => key.slice(String(propertyId).length + 1))
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))

/**
 * Parse a student's room string ("Room 203 - Bed B", "Room S1 - Bed A").
 * floor is the floor number as a string, or 'S' for units outside floors.
 */
export const parseRoomString = (room?: string) => {
  const match = room?.match(/Room (S\d+|\d+) - Bed ([A-Z0-9]+)/i)
  if (!match) return null
  const roomNum = match[1].toUpperCase()
  const floor = roomNum.startsWith('S') ? 'S' : String(Math.floor(Number(roomNum) / 100))
  return { roomNum, floor, bed: match[2] }
}

export type BedType = 'independent' | 'bunk'

export const BED_TYPES: { value: BedType; label: string }[] = [
  { value: 'independent', label: 'Independent Bed' },
  { value: 'bunk', label: 'Bunk Bed' },
]

export const bedTypeLabel = (type?: string) => BED_TYPES.find((t) => t.value === type)?.label || 'Independent Bed'

/** Bed type at a bed index; beds without a stored type are independent. */
export const bedTypeAt = (bedTypes: string[] | undefined, index: number): BedType =>
  bedTypes?.[index] === 'bunk' ? 'bunk' : 'independent'

/** Count of bunk and independent beds among the first `beds` beds. */
export const bedTypeCounts = (bedTypes: string[] | undefined, beds: number) => {
  let bunk = 0
  for (let i = 0; i < beds; i++) if (bedTypeAt(bedTypes, i) === 'bunk') bunk++
  return { bunk, independent: beds - bunk }
}

export type BunkPosition = 'lower' | 'upper'

export const BUNK_POSITIONS: { value: BunkPosition; label: string }[] = [
  { value: 'lower', label: 'Lower' },
  { value: 'upper', label: 'Upper' },
]

/** Bunk position of a bed, or null when the bed is not a bunk. */
export const bunkPositionAt = (
  bedTypes: string[] | undefined,
  bunkPositions: (string | null)[] | undefined,
  index: number,
): BunkPosition | null => {
  if (bedTypeAt(bedTypes, index) !== 'bunk') return null
  const stored = bunkPositions?.[index]
  if (stored === 'upper' || stored === 'lower') return stored
  return defaultBunkPosition(bedTypes, index)
}

/** New bunk beds alternate lower, upper, lower... in bed order. */
export const defaultBunkPosition = (bedTypes: string[] | undefined, index: number): BunkPosition => {
  let bunksBefore = 0
  for (let i = 0; i < index; i++) if (bedTypeAt(bedTypes, i) === 'bunk') bunksBefore++
  return bunksBefore % 2 === 0 ? 'lower' : 'upper'
}

/** "Independent Bed", "Bunk Bed · Upper", ... */
export const bedTypeDisplay = (
  bedTypes: string[] | undefined,
  bunkPositions: (string | null)[] | undefined,
  index: number,
) => {
  const position = bunkPositionAt(bedTypes, bunkPositions, index)
  return position ? `Bunk Bed · ${position === 'upper' ? 'Upper' : 'Lower'}` : 'Independent Bed'
}

/** One-click amenities offered in the unit editor (staff can still add custom ones). */
export const PRESET_AMENITIES: Amenity[] = [
  { name: 'Study Table', included: true },
  { name: 'Wardrobe', included: true },
  { name: 'Same floor Kitchen', included: true, shared: true },
  { name: 'Same floor Washroom', included: true, shared: true },
  { name: 'Kitchen', included: true },
  { name: 'Washroom', included: true },
  { name: 'Toilet', included: true },
  { name: 'Washing Machine', included: true },
  { name: 'WiFi', included: true },
]
