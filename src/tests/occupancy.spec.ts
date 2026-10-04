// Pure tests for bed occupancy. Run alone with:
//   npx jest src/tests/occupancy.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'

import { occupancy, occupancyPercent } from '@/lib/occupancy'

const properties: any[] = [
  { id: 'p1', name: 'Bukowiecka 11', floors: 2, roomsPerFloor: [1, 1], beds: 2 },
  { id: 'p2', name: 'Rajmunda 3', floors: 1, roomsPerFloor: [1], beds: 2 },
]
const overrides: any[] = [
  { overrideKey: 'p1-101', unitType: 'room', beds: 3, bedStatuses: [true, true, false] },
  { overrideKey: 'p1-201', unitType: 'apartment', subRooms: [{ name: 'Bedroom 1', beds: 2 }, { name: 'Bedroom 2', beds: 1 }], bedStatuses: [false, true, true] },
  { overrideKey: 'p1-S1', standalone: true, unitType: 'studio', beds: 1, bedStatuses: [true] },
  { overrideKey: 'p2-101', unitType: 'room', beds: 2, status: 'maintenance', bedStatuses: [true, true] },
]

describe('occupancy', () => {
  const result = occupancy(properties, overrides, [{ overrideKey: 'p1-101', bedIndex: 1 }, { overrideKey: 'p1-201', bedIndex: 2 }])

  it('counts every bed across properties, leaving out units under maintenance', () => {
    expect(result.total).toEqual({ totalBeds: 7, takenBeds: 5, heldBeds: 2 })
    expect(occupancyPercent(result.total)).toBe(71)
  })

  it('splits by property and floor, apartments and units outside floors included', () => {
    const p1 = result.properties.find((p) => p.id === 'p1')!
    expect(p1).toMatchObject({ totalBeds: 7, takenBeds: 5, heldBeds: 2 })
    expect(p1.floors.map((f) => [f.floor, f.totalBeds, f.takenBeds])).toEqual([[1, 3, 2], [2, 3, 2], [null, 1, 1]])
    expect(result.properties.find((p) => p.id === 'p2')).toMatchObject({ totalBeds: 0, takenBeds: 0 })
  })

  it('counts floor rooms staff never edited as free beds', () => {
    expect(occupancy([{ id: 'p3', name: 'X', floors: 1, roomsPerFloor: [2], beds: 2 } as any], []).total).toEqual({ totalBeds: 4, takenBeds: 0, heldBeds: 0 })
  })
})
