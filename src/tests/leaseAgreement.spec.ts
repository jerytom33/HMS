// Tests for the lease agreement fill-in, against the real template. Run alone with:
//   npx jest src/tests/leaseAgreement.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'
import { strFromU8, unzipSync } from 'fflate'
import { readFileSync } from 'fs'
import path from 'path'

import { agreementFileName, agreementValues, fillAgreement, propertyAddress } from '@/lib/leaseAgreement'

const template = new Uint8Array(readFileSync(path.join(__dirname, '../templates/lease-agreement.docx')))
const text = (docx: Uint8Array) => strFromU8(unzipSync(docx)['word/document.xml']).replace(/<[^>]+>/g, '')

const booking = {
  ref: 'KLS-ABC234', type: 'bed_hold', name: 'Anna Nowak', whatsapp: '48500111222', phone: '48500111222',
  arrivalDate: '20/11/2026', overrideKey: 'p1-102', bed: 'Bed C', price: 1100, deposit: 1100,
}
const property = { name: 'Bukowiecka 11', location: 'Targowek ,Warsaw ,Poland' }

describe('agreement values', () => {
  it('fills from the booking, property and student', () => {
    expect(agreementValues(booking, property, { name: 'Anna Maria Nowak', email: 'anna@example.com' })).toEqual({
      contractDate: '20.11.2026',
      startDate: '20.11.2026',
      tenantName: 'Anna Maria Nowak',
      passportNo: '',
      passportValidUntil: '',
      tenantEmail: 'anna@example.com',
      tenantPhone: '+48500111222',
      propertyAddress: 'Bukowiecka 11, Targowek, Warsaw, Poland',
      roomNo: '102',
      floorNo: '0',
      bed: 'Bed C',
      rent: '900',
      deposit: '1100',
    })
  })

  it('counts floors from 0 and leaves units outside floors without one', () => {
    expect(agreementValues({ ...booking, overrideKey: 'p1-305' }, property, null).floorNo).toBe('2')
    expect(agreementValues({ ...booking, overrideKey: 'p1-S2' }, property, null)).toMatchObject({ roomNo: 'S2', floorNo: '' })
  })

  it('uses the unit\u2019s current rent when the booking was made before the unit had one', () => {
    const unpriced = { ...booking, price: undefined, deposit: undefined }
    expect(agreementValues(unpriced, property, null, { roomPrice: '1250' })).toMatchObject({ rent: '1050', deposit: '1250' })
    expect(agreementValues(unpriced, property, null, { roomPrice: '1250', deposit: '1000' })).toMatchObject({ rent: '1050', deposit: '1000' })
  })

  it('keeps the price agreed at booking over a later unit price', () => {
    expect(agreementValues(booking, property, null, { roomPrice: '1400', deposit: '1400' })).toMatchObject({ rent: '900', deposit: '1100' })
  })

  it('leaves rent and deposit blank when unknown', () => {
    expect(agreementValues({ ...booking, price: undefined, deposit: undefined }, property, null)).toMatchObject({ rent: '', deposit: '' })
  })

  it('tidies the address', () => {
    expect(propertyAddress({ name: 'Michala Sobzaka 18', location: ' Bemowo ,Warsaw, Poland' })).toBe('Michala Sobzaka 18, Bemowo, Warsaw, Poland')
  })
})

describe('filled agreement', () => {
  const filled = text(fillAgreement(template, agreementValues(booking, property, null)))

  it('puts the values in both languages and leaves no tags', () => {
    expect(filled).not.toContain('{{')
    expect(filled).toContain('zawarta w dniu 20.11.2026 roku')
    expect(filled).toContain('concluded on 20.11.2026 in Warsaw')
    expect(filled).toContain('położonego pod adresem: Bukowiecka 11, Targowek, Warsaw, Poland')
    expect(filled).toContain('miejsce w pokoju nr 102, na piętrze nr 0')
    expect(filled).toContain('in room no. 102, on floor no. 0')
    expect(filled).toContain('w wysokości 900 zł miesięcznie')
    expect(filled).toContain('amount of PLN 900 per month')
    expect(filled).toContain('kaucję w wysokości 1100 zł.')
    expect(filled).toContain('Deposit paid: PLN 1100')
    expect(filled).toContain('Miejsce/łóżko: Bed C')
  })

  it('keeps blank lines for what HMS does not have', () => {
    expect(filled).toContain('paszport nr ________________, ważny do dnia ____________ roku')
    expect(filled).toContain('e-mail: ________________________; tel. +48500111222')
    expect(filled).toContain('Data przekazania: ____________________')
  })

  it('escapes text for Word', () => {
    expect(text(fillAgreement(template, { tenantName: 'A & <B>' }))).toContain('A &amp; &lt;B&gt;')
  })

  it('names the download after the booking', () => {
    expect(agreementFileName({ ref: 'KLS-ABC234', name: 'Łucja Żak' })).toBe('Umowa-najmu-KLS-ABC234-Lucja-Zak.docx')
  })
})
