// Pure tests for the one-booking-per-student refusal. Run alone with:
//   npx jest src/tests/oneBooking.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'

import { ACTIVE_STATUSES, alreadyBookedResult } from '@/lib/bedHold'

const booking = { ref: 'KLS-ABC234', room: 'Room 101', bed: 'Bed A', hostel: 'Bukowiecka 11' }

describe('one booking per student', () => {
  it('counts held and paid bookings, not cancelled ones', () => {
    expect(ACTIVE_STATUSES).toEqual(['held', 'paid'])
  })

  it('asks to cancel a held booking before booking again', () => {
    const r = alreadyBookedResult({ ...booking, status: 'held' })
    expect(r).toMatchObject({ ok: false, reason: 'already_booked', bookingRef: 'KLS-ABC234', canCancel: true })
    expect(r.message).toContain('Room 101, Bed A — Bukowiecka 11')
    expect(r.message).toMatch(/cancel this booking first/)
  })

  it('sends paid bookings to the team instead', () => {
    const r = alreadyBookedResult({ ...booking, status: 'paid' })
    expect(r.canCancel).toBe(false)
    expect(r.message).toMatch(/contact our team/)
  })
})
