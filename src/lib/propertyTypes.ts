export const PROPERTY_TYPES = [
  { value: 'rooms', label: 'Rooms', unit: 'Room' },
  { value: 'studio', label: 'Studio', unit: 'Studio' },
  { value: 'apartment', label: 'Apartment', unit: 'Apartment' },
]

/** Singular name for one unit of a property type, e.g. "Room", "Studio". */
export const unitLabel = (type?: string) => PROPERTY_TYPES.find((t) => t.value === type)?.unit || 'Room'

/** Display name of a property type, e.g. "Rooms", "Apartment". */
export const typeLabel = (type?: string) => PROPERTY_TYPES.find((t) => t.value === type)?.label || 'Rooms'

/** Pad or trim floor names to match the floor count. */
export const fitFloorNames = (names: string[] | undefined, floors: number) =>
  Array.from({ length: Math.max(floors, 1) }, (_, i) => names?.[i] || '')

/** Room number for the nth room (0-based) on a floor: floor 2, index 0 -> 201. */
export const roomNumber = (floor: number | string, index: number) => Number(floor) * 100 + index + 1

/** Floor label: custom name if set, otherwise "Floor N". */
export const floorLabel = (property: any, floor: number | string) =>
  property?.floorNames?.[Number(floor) - 1] || `Floor ${floor}`

/** Room label: custom name from its override if set, otherwise "<Unit> <number>". */
export const roomLabel = (property: any, roomNum: number | string, override?: { roomName?: string }) =>
  override?.roomName || `${unitLabel(property?.propertyType)} ${roomNum}`
