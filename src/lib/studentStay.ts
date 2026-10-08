// Where a student stays, for the staff panel: the bed staff assigned (student.room +
// student.property), else the bed of their booking (paid first, then on hold). Pure, so the
// Students list and the student page work it out the same way from data they already loaded.
import { bedDisplayLabel, bedTypeDisplay, floorLabel, parseRoomString, unitLabel } from './propertyTypes'

export type StayBooking = {
  id: string; ref: string; type: string; status: string; whatsapp?: string; hostel?: string; room?: string; floor?: string; bed?: string;
  bedIndex?: number; overrideKey?: string; propertyId?: string; arrivalDate?: string; price?: number; deposit?: number;
  minStayAgreed?: boolean; agreementGeneratedAt?: string; paidAt?: string; createdAt?: string; sharing?: number;
}

export type Stay = {
  /** 'assigned' by staff on the student's record, or from a 'paid' / 'held' booking */
  source: 'assigned' | 'paid' | 'held'
  hostel: string
  unitType: string
  unit: string
  floor: string
  bed: string
  bedType: string
  booking: StayBooking | null
}

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '')

/** The student's bookings (bed holds), newest first, matched by WhatsApp number (or phone). */
export function bookingsOf(student: any, bookings: StayBooking[]): StayBooking[] {
  const numbers = new Set([digits(student?.whatsapp), digits(student?.phone)].filter((n) => n.length >= 8))
  return bookings
    .filter((b) => b.type === 'bed_hold' && numbers.has(digits(b.whatsapp)))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export function studentStay(student: any, bookings: StayBooking[], properties: any[], overrides: Record<string, any>): Stay | null {
  const own = bookingsOf(student, bookings)
  const active = own.find((b) => b.status === 'paid') || own.find((b) => b.status === 'held') || null

  // A bed staff assigned by hand on the student's record
  const parsed = parseRoomString(student?.room)
  const property = parsed && properties.find((p) => p.name === student.property)
  if (parsed && property) {
    const o = overrides[`${property.id}-${parsed.roomNum}`]
    const unitType = o?.unitType || (parsed.floor === 'S' ? 'studio' : 'room')
    const bedIndex = /^[A-Z]$/.test(parsed.bed) ? parsed.bed.charCodeAt(0) - 65 : Number(parsed.bed) - 1
    return {
      source: 'assigned',
      hostel: property.name,
      unitType: unitLabel(unitType),
      unit: o?.roomName?.trim() || `${unitLabel(unitType)} ${parsed.roomNum}`,
      floor: parsed.floor === 'S' ? 'Outside floors' : floorLabel(property, Number(parsed.floor)),
      bed: bedDisplayLabel({ unitType, subRooms: o?.subRooms }, bedIndex),
      bedType: bedTypeDisplay(o?.bedTypes, o?.bunkPositions, bedIndex),
      booking: active,
    }
  }

  if (!active) return null
  const o = active.overrideKey ? overrides[active.overrideKey] : undefined
  const roomNum = String(active.overrideKey || '').split('-').pop() || ''
  const unitType = o?.unitType || (roomNum.startsWith('S') ? 'studio' : 'room')
  return {
    source: active.status === 'paid' ? 'paid' : 'held',
    hostel: active.hostel || '',
    unitType: unitLabel(unitType),
    unit: active.room || '',
    floor: active.floor || '',
    bed: active.bed || '',
    bedType: typeof active.bedIndex === 'number' ? bedTypeDisplay(o?.bedTypes, o?.bunkPositions, active.bedIndex) : '',
    booking: active,
  }
}

/** Status to show: Active once paid or assigned, On hold while the booking waits, else the record's. */
export const studentStatus = (student: any, stay: Stay | null) =>
  stay?.source === 'paid' || stay?.source === 'assigned' ? 'Active' : stay?.source === 'held' ? 'On hold' : student?.status || 'Prospective'

export const STAY_LABEL: Record<Stay['source'], string> = { assigned: 'Assigned', paid: 'Paid', held: 'On hold' }
