// Pure tests for where a student stays (staff panel). Run alone with:
//   npx jest src/tests/studentStay.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'

import { bookingsOf, studentStay } from '@/lib/studentStay'

const properties = [{ id: 'p1', name: 'Bukowiecka 11', floorNames: [] }]
const overrides: Record<string, any> = {
  'p1-202': { overrideKey: 'p1-202', unitType: 'room', beds: 2, bedTypes: ['independent', 'bunk'], bunkPositions: [null, 'upper'] },
  'p1-101': { overrideKey: 'p1-101', unitType: 'apartment', roomName: 'FRONT studio 1', subRooms: [{ name: 'Bedroom 1', beds: 2 }] },
}
const student = { id: 's1', name: 'Anna', whatsapp: '48500111222' }
const booking = (over: any) => ({ id: 'b', ref: 'KLS-AAA', type: 'bed_hold', whatsapp: '48500111222', hostel: 'Bukowiecka 11', createdAt: '2026-10-01T10:00:00Z', ...over })

describe('studentStay', () => {
  it('shows the bed of a paid booking with unit type, floor and bed type', () => {
    const stay = studentStay(student, [booking({ status: 'paid', room: 'Room 202', floor: '1st Floor', bed: 'Bed B', bedIndex: 1, overrideKey: 'p1-202' })], properties, overrides)
    expect(stay).toMatchObject({ source: 'paid', hostel: 'Bukowiecka 11', unitType: 'Room', unit: 'Room 202', floor: '1st Floor', bed: 'Bed B', bedType: 'Bunk Bed · Upper' })
  })

  it('prefers paid over on hold and ignores cancelled bookings', () => {
    const list = [
      booking({ id: '1', ref: 'KLS-C', status: 'cancelled', createdAt: '2026-10-03T00:00:00Z', overrideKey: 'p1-202', bedIndex: 0 }),
      booking({ id: '2', ref: 'KLS-H', status: 'held', createdAt: '2026-10-02T00:00:00Z', overrideKey: 'p1-202', bedIndex: 0 }),
    ]
    expect(studentStay(student, list, properties, overrides)).toMatchObject({ source: 'held', booking: { ref: 'KLS-H' } })
    expect(studentStay(student, [list[0]], properties, overrides)).toBeNull()
  })

  it('names apartments by their unit type', () => {
    const stay = studentStay(student, [booking({ status: 'held', room: 'FRONT studio 1 · Bedroom 1', bed: 'Bedroom 1 · Bed A', bedIndex: 0, overrideKey: 'p1-101' })], properties, overrides)
    expect(stay).toMatchObject({ unitType: 'Apartment', unit: 'FRONT studio 1 · Bedroom 1', bedType: 'Independent Bed' })
  })

  it('uses a bed staff assigned by hand first', () => {
    const stay = studentStay({ ...student, room: 'Room 202 - Bed A', property: 'Bukowiecka 11' }, [], properties, overrides)
    expect(stay).toMatchObject({ source: 'assigned', unit: 'Room 202', bed: 'Bed A', bedType: 'Independent Bed', floor: '1st Floor' })
  })

  it('matches bookings by WhatsApp or phone number', () => {
    expect(bookingsOf({ phone: '+48 500 111 222' }, [booking({ status: 'held' })])).toHaveLength(1)
    expect(bookingsOf({ whatsapp: '48999999999' }, [booking({ status: 'held' })])).toHaveLength(0)
  })
})

describe('studentStatus', () => {
  it('follows the booking', async () => {
    const { studentStatus } = await import('@/lib/studentStay')
    expect(studentStatus({ status: 'Prospective' }, { source: 'paid' } as any)).toBe('Active')
    expect(studentStatus({ status: 'Prospective' }, { source: 'held' } as any)).toBe('On hold')
    expect(studentStatus({ status: 'Prospective' }, null)).toBe('Prospective')
    expect(studentStatus({}, null)).toBe('Prospective')
  })
})
