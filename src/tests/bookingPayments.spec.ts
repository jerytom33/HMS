// Pure tests for paid bookings shown as payments. Run alone with:
//   npx jest src/tests/bookingPayments.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'

import { bookingPayments } from '@/lib/bookingPayments'

const paid = { type: 'bed_hold', status: 'paid', ref: 'KLS-AAA222', name: 'Anna Nowak', hostel: 'Bukowiecka 11', propertyId: 'p1', room: 'Room 102', bed: 'Bed C', overrideKey: 'p1-102', paidAt: '2026-10-04T12:20:36.863Z' }

describe('booking payments', () => {
  it('turns a paid booking into its rent and deposit payments', () => {
    expect(bookingPayments([{ ...paid, price: 1100, deposit: 1000 }], {})).toEqual([
      expect.objectContaining({ id: 'KLS-AAA222-R', type: 'Rent', amount: 1100, status: 'Completed', date: '2026-10-04', room: 'Room 102 - Bed C', bookingRef: 'KLS-AAA222' }),
      expect.objectContaining({ id: 'KLS-AAA222-D', type: 'Deposit', amount: 1000 }),
    ])
  })

  it("uses the unit's current amounts when the booking has none", () => {
    expect(bookingPayments([paid], { 'p1-102': { roomPrice: '1250' } }).map((p) => [p.type, p.amount])).toEqual([['Rent', 1250], ['Deposit', 1250]])
  })

  it('ignores bookings that are not paid', () => {
    expect(bookingPayments([{ ...paid, status: 'held', price: 1100 }, { ...paid, status: 'cancelled', price: 1100 }], {})).toEqual([])
  })
})
