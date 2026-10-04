// Pure tests for the passport details students enter for their agreement. Run alone with:
//   npx jest src/tests/passport.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'

import { agreementValues } from '@/lib/leaseAgreement'
import { parsePassportExpiry, parsePassportNumber, passportStatus } from '@/lib/passport'

// 4 October 2026, 23:30 in Warsaw
const now = new Date('2026-10-04T21:30:00Z')

describe('passport number', () => {
  it('keeps letters and digits, upper-cased', () => {
    expect(parsePassportNumber('ab 123-4567')).toBe('AB1234567')
  })
  it('refuses anything too short, too long or with other characters', () => {
    expect(parsePassportNumber('AB12')).toBeNull()
    expect(parsePassportNumber('A'.repeat(21))).toBeNull()
    expect(parsePassportNumber('AB/12345')).toBeNull()
    expect(parsePassportNumber(undefined)).toBeNull()
  })
})

describe('passport expiry', () => {
  it('accepts a future date and stores it as DD/MM/YYYY', () => {
    expect(parsePassportExpiry('2030-02-15', now)).toEqual({ ok: true, date: '15/02/2030' })
  })
  it('refuses expired, today, impossible and far-off dates', () => {
    expect(parsePassportExpiry('2026-10-04', now)).toMatchObject({ ok: false })
    expect(parsePassportExpiry('2025-01-01', now)).toMatchObject({ ok: false, message: expect.stringMatching(/expired/) })
    expect(parsePassportExpiry('2027-02-30', now)).toMatchObject({ ok: false })
    expect(parsePassportExpiry('2045-01-01', now)).toMatchObject({ ok: false })
    expect(parsePassportExpiry('15/02/2030', now)).toMatchObject({ ok: false })
  })
})

describe('passport status', () => {
  it('treats anything unknown as not entered', () => {
    expect(passportStatus({})).toBe('none')
    expect(passportStatus({ passportStatus: 'weird' })).toBe('none')
    expect(passportStatus({ passportStatus: 'verified' })).toBe('verified')
  })
  it('fills the agreement passport blanks', () => {
    const v = agreementValues({ overrideKey: 'p-101', arrivalDate: '20/11/2026' }, null, { passportNumber: 'AB1234567', passportValidUntil: '15/02/2030' })
    expect(v).toMatchObject({ passportNo: 'AB1234567', passportValidUntil: '15.02.2030' })
  })
})
