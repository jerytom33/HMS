// Pure tests for the deposit default (same as the rent unless staff set one). Run alone with:
//   npx jest src/tests/deposit.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'

import { listUnits } from '@/lib/botRooms'
import { agreementValues } from '@/lib/leaseAgreement'
import { unitDeposit } from '@/lib/propertyTypes'

describe('deposit', () => {
  it('equals the rent by default', () => {
    expect(unitDeposit({ roomPrice: '1250' })).toBe(1250)
    expect(unitDeposit({ roomPrice: '1250', deposit: '' })).toBe(1250)
  })

  it('uses the amount staff set, including 0', () => {
    expect(unitDeposit({ roomPrice: '1250', deposit: '900' })).toBe(900)
    expect(unitDeposit({ roomPrice: '1250', deposit: '0' })).toBe(0)
  })

  it('is unknown when neither is set', () => {
    expect(unitDeposit({})).toBeNull()
    expect(unitDeposit(null)).toBeNull()
  })

  it('reaches the bot and portal room lists', () => {
    const [unit] = listUnits(
      [{ id: 'p1', name: 'Bukowiecka 11', floors: 1, roomsPerFloor: [1] }],
      [{ overrideKey: 'p1-101', unitType: 'room', beds: 2, roomPrice: '1250' }],
    )
    expect(unit).toMatchObject({ price: 1250, deposit: 1250 })
  })

  it('fills the agreement from the price for older bookings without a deposit', () => {
    expect(agreementValues({ overrideKey: 'p-101', price: 1250 }, null, null).deposit).toBe('1250')
    expect(agreementValues({ overrideKey: 'p-101', price: 1250, deposit: 1000 }, null, null).deposit).toBe('1000')
  })
})
