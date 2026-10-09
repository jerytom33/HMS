// Pure tests for the monthly rent schedule. Run alone with:
//   npx jest src/tests/rent.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'

import { addMonths, monthlyRent, rentSchedule, showDate } from '@/lib/rent'

// Agreement generated 9 Oct 2026, noon in Warsaw
const booking = { id: 'b1', status: 'paid', agreementGeneratedAt: '2026-10-09T10:00:00Z' }

describe('rent schedule', () => {
  it('starts 30 days after the agreement', () => {
    const s = rentSchedule(booking, 1100, [], '2026-10-09')!
    expect(s.firstDue).toBe('2026-11-08')
    expect(s.periods).toHaveLength(1)
    expect(s.next).toMatchObject({ dueDate: '2026-11-08', status: 'upcoming', amount: 1100 })
  })

  it('is due soon within 7 days and overdue after the due date', () => {
    expect(rentSchedule(booking, 1100, [], '2026-11-03')!.next!.status).toBe('due')
    const s = rentSchedule(booking, 1100, [], '2026-11-10')!
    expect(s.overdue.map((p) => p.dueDate)).toEqual(['2026-11-08'])
    expect(s.next).toMatchObject({ dueDate: '2026-11-08', status: 'overdue' })
    expect(s.periods.map((p) => p.dueDate)).toEqual(['2026-11-08', '2026-12-08'])
  })

  it('repeats monthly and counts what is overdue and paid', () => {
    const payments = [{ bookingId: 'b1', dueDate: '2026-11-08', amount: 1100, paidAt: '2026-11-07T10:00:00Z' }]
    const s = rentSchedule(booking, 1100, payments, '2027-01-20')!
    expect(s.periods.map((p) => [p.dueDate, p.status])).toEqual([
      ['2026-11-08', 'paid'], ['2026-12-08', 'overdue'], ['2027-01-08', 'overdue'], ['2027-02-08', 'upcoming'],
    ])
    expect(s.overdueAmount).toBe(2200)
    expect(s.paidAmount).toBe(1100)
    expect(s.next!.dueDate).toBe('2026-12-08')
  })

  it('ignores payments of other bookings and stops for cancelled bookings or no agreement', () => {
    expect(rentSchedule(booking, 1100, [{ bookingId: 'other', dueDate: '2026-11-08', amount: 1100 }], '2026-11-10')!.overdue).toHaveLength(1)
    expect(rentSchedule({ ...booking, status: 'cancelled' }, 1100, [], '2026-11-10')).toBeNull()
    expect(rentSchedule({ id: 'b2', status: 'paid' }, 1100, [], '2026-11-10')).toBeNull()
  })

  it('keeps the due day through short months', () => {
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28')
    expect(addMonths('2027-01-31', 2)).toBe('2027-03-31')
    expect(showDate('2026-11-08')).toBe('08/11/2026')
  })

  it("uses the booking's price, else the unit's", () => {
    expect(monthlyRent({ price: 1100 }, { roomPrice: '1250' })).toBe(1100)
    expect(monthlyRent({}, { roomPrice: '1250' })).toBe(1250)
    expect(monthlyRent({}, null)).toBeNull()
  })
})
