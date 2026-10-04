// Pure tests for the student's assigned-room lookup. Run alone with:
//   npx jest src/tests/studentRoom.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'

import { bookingAssignment, findAssignment } from '@/lib/studentRoom'

const properties: any[] = [
  { id: 'p1', name: 'Bukowiecka 11', floors: 2, roomsPerFloor: [2, 2] },
  { id: 'p2', name: 'Kasprzaka 5', floors: 1, roomsPerFloor: [1] },
]

describe('findAssignment', () => {
  it('finds the bed by the occupant slot holding the student id', () => {
    const overrides: any[] = [{ overrideKey: 'p1-201', bedOccupants: [null, 'stu1'] }]
    const found = findAssignment({ id: 'stu1', room: 'Room 101 - Bed A', property: 'Kasprzaka 5' }, properties, overrides)
    expect(found).toMatchObject({ roomNum: '201', bedIndex: 1 })
    expect(found!.property.id).toBe('p1')
  })

  it('falls back to the room text and property name', () => {
    const found = findAssignment({ id: 'stu2', room: 'Room 101 - Bed C', property: 'Kasprzaka 5' }, properties, [])
    expect(found).toMatchObject({ roomNum: '101', bedIndex: 2, override: undefined })
    expect(found!.property.id).toBe('p2')
  })

  it('handles units outside floors', () => {
    const overrides: any[] = [{ overrideKey: 'p1-S1', standalone: true }]
    const found = findAssignment({ id: 'stu3', room: 'Room S1 - Bed A', property: 'Bukowiecka 11' }, properties, overrides)
    expect(found).toMatchObject({ roomNum: 'S1', bedIndex: 0 })
    expect(found!.override).toBe(overrides[0])
  })

  it('returns null when nothing is assigned', () => {
    expect(findAssignment({ id: 'stu4', room: 'Unassigned', property: '' }, properties, [])).toBeNull()
    expect(findAssignment({ id: 'stu5', room: 'Room 101 - Bed A', property: 'Unknown' }, properties, [])).toBeNull()
  })
})

describe('bookingAssignment', () => {
  it('takes the unit and bed of a paid booking', () => {
    const overrides: any[] = [{ overrideKey: 'p1-102' }]
    const found = bookingAssignment({ overrideKey: 'p1-102', propertyId: 'p1', bedIndex: 2 }, properties, overrides)
    expect(found).toMatchObject({ roomNum: '102', bedIndex: 2 })
    expect(found!.property.id).toBe('p1')
    expect(found!.override).toBe(overrides[0])
  })

  it('works for a floor room staff never edited and for apartments', () => {
    expect(bookingAssignment({ overrideKey: 'p2-101', bedIndex: 0 }, properties, [])).toMatchObject({ roomNum: '101', override: undefined })
  })

  it('needs a known property and a bed', () => {
    expect(bookingAssignment({ overrideKey: 'zz-101', bedIndex: 0 }, properties, [])).toBeNull()
    expect(bookingAssignment({ overrideKey: 'p1-101' }, properties, [])).toBeNull()
    expect(bookingAssignment(null, properties, [])).toBeNull()
  })
})
