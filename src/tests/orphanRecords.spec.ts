import { describe, expect, it } from '@jest/globals'

import { releaseMissingOccupants } from '../lib/orphanRecords'

describe('releaseMissingOccupants', () => {
  it('frees only the beds of missing students and recomputes the counts', () => {
    const result = releaseMissingOccupants(
      { overrideKey: 'p1-101', beds: 3, status: 'occupied', bedStatuses: [true, true, true], bedOccupants: ['gone', 'here', null] },
      new Set(['gone']),
    )
    expect(result).toEqual({
      released: 1,
      bedStatuses: [false, true, true],
      bedOccupants: [null, 'here', null],
      filledBeds: 2,
      freeBeds: 1,
      status: 'available',
    })
  })

  it('keeps a room in maintenance', () => {
    const result = releaseMissingOccupants(
      { overrideKey: 'p1-102', beds: 1, status: 'maintenance', bedStatuses: [true], bedOccupants: ['gone'] },
      new Set(['gone']),
    )
    expect(result.status).toBe('maintenance')
    expect(result.freeBeds).toBe(1)
  })

  it('changes nothing when every occupant exists', () => {
    const result = releaseMissingOccupants(
      { overrideKey: 'p1-103', beds: 2, status: 'occupied', bedStatuses: [true, true], bedOccupants: ['a', 'b'] },
      new Set(['gone']),
    )
    expect(result.released).toBe(0)
    expect(result.status).toBe('occupied')
  })
})
