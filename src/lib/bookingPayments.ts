// Paid bookings as payments for the staff Payments page and dashboard: each paid bed hold is
// two completed payments, the first month's rent and the deposit, as agreed at booking (or
// the unit's current amounts for bookings made before the unit had a rent).
import { parseAmount } from './currency'
import { unitDeposit } from './propertyTypes'

export type BookingPayment = {
  id: string; bookingRef: string; student: string; property: string; propertyId: string; room: string;
  type: 'Rent' | 'Deposit'; amount: number; status: 'Completed'; date: string;
}

export function bookingPayments(paidBookings: any[], units: Record<string, { roomPrice?: string; deposit?: string } | undefined>): BookingPayment[] {
  return paidBookings
    .filter((b) => b.type === 'bed_hold' && b.status === 'paid')
    .flatMap((b) => {
      const unit = units[b.overrideKey]
      const rent = typeof b.price === 'number' ? b.price : parseAmount(unit?.roomPrice)
      const deposit = typeof b.deposit === 'number' ? b.deposit : typeof b.price === 'number' ? b.price : unitDeposit(unit)
      const base = {
        bookingRef: b.ref,
        student: b.name || `+${b.whatsapp}`,
        property: b.hostel || '',
        propertyId: String(b.propertyId || ''),
        room: b.room && b.bed ? `${b.room} - ${b.bed}` : b.room || '',
        status: 'Completed' as const,
        date: String(b.paidAt || b.updatedAt || b.createdAt || '').slice(0, 10),
      }
      return [
        ...(rent !== null ? [{ ...base, id: `${b.ref}-R`, type: 'Rent' as const, amount: rent }] : []),
        ...(deposit !== null ? [{ ...base, id: `${b.ref}-D`, type: 'Deposit' as const, amount: deposit }] : []),
      ]
    })
}

/** Monthly rent payments staff recorded (v1-rent-payments) as completed Rent payments. */
export function rentPaymentRows(rentPayments: any[]) {
  return rentPayments.map((p) => ({
    id: `RENT-${p.ref || p.bookingId}-${p.dueDate}`,
    bookingRef: '',
    rentFor: String(p.dueDate || ''),
    student: p.name || (p.whatsapp ? `+${p.whatsapp}` : ''),
    property: p.hostel || '',
    propertyId: '',
    room: p.room || '',
    type: 'Rent' as const,
    amount: Number(p.amount) || 0,
    status: 'Completed' as const,
    date: String(p.paidAt || p.createdAt || '').slice(0, 10),
    ref: p.ref || '',
  }))
}
