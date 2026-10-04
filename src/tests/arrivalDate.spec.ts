// Pure tests for the arrival date rule the WhatsApp bot uses. Run alone with:
//   npx jest src/tests/arrivalDate.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'

import { arrivalRange, dmyToIso, parseArrivalDate, parsePortalArrivalDate } from '../lib/studentAuth'

// 4 October 2026, 23:30 in Warsaw (21:30 UTC): still the 4th in Poland
const now = new Date('2026-10-04T21:30:00Z')
const check = (text: string) => parseArrivalDate(text, now)

describe('arrival date', () => {
  it('accepts a future date within six months', () => {
    expect(check('05/10/2026')).toEqual({ ok: true, date: '05/10/2026' })
    expect(check('4/4/2027')).toEqual({ ok: true, date: '04/04/2027' })
    expect(check('15.02.2027')).toEqual({ ok: true, date: '15/02/2027' })
  })

  it('refuses today, the past and dates beyond six months', () => {
    const today = check('04/10/2026')
    expect(today.ok).toBe(false)
    if (!today.ok) expect(today.message).toBe('The arrival date must be in the future. Please send a date between 05/10/2026 and 04/04/2027 📅')
    expect(check('01/01/2026').ok).toBe(false)
    const far = check('05/04/2027')
    expect(far.ok).toBe(false)
    if (!far.ok) expect(far.message).toMatch(/^We take bookings up to 6 months ahead/)
  })

  it('refuses impossible dates and other formats', () => {
    expect(check('31/02/2027').ok).toBe(false)
    expect(check('2027-02-15').ok).toBe(false)
    expect(check('next week').ok).toBe(false)
  })

  it('uses the date in Poland, not UTC', () => {
    // 22:30 UTC on 4 Oct is already 5 Oct in Warsaw, so the 5th is no longer in the future
    expect(parseArrivalDate('05/10/2026', new Date('2026-10-04T22:30:00Z')).ok).toBe(false)
  })

  it('caps at the month end when six months on has fewer days', () => {
    const aug31 = new Date('2026-08-31T10:00:00Z')
    expect(parseArrivalDate('28/02/2027', aug31).ok).toBe(true)
    expect(parseArrivalDate('01/03/2027', aug31).ok).toBe(false)
  })

  it('gives the date picker the same range and reads its YYYY-MM-DD dates', () => {
    expect(arrivalRange(now)).toEqual({ min: '2026-10-05', max: '2027-04-04' })
    expect(parsePortalArrivalDate('2026-10-05', now)).toEqual({ ok: true, date: '05/10/2026' })
    expect(parsePortalArrivalDate('2027-04-05', now).ok).toBe(false)
    expect(parsePortalArrivalDate('', now).ok).toBe(false)
    expect(dmyToIso('15/02/2027')).toBe('2027-02-15')
    expect(dmyToIso('15-02-2027')).toBe('')
  })
})
