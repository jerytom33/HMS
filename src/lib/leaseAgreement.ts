// The lease agreement (Umowa najmu, PL/EN) filled in from a booking, as an editable Word file.
// src/templates/lease-agreement.docx is the landlord's document with each blank replaced by
// {{name|________}}: the value, or the original blank line when HMS doesn't have it (passport,
// email), so staff can still write it in by hand.
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

import { splitOverrideKey } from './botRooms'
import { parseAmount } from './currency'
import { unitDeposit } from './propertyTypes'

/** Monthly utilities in the agreement (§4.3); the advertised price includes them, so the contract rent is price minus this. */
export const UTILITIES_PLN = 200

export type AgreementValues = Record<
  | 'contractDate' | 'startDate' | 'tenantName' | 'passportNo' | 'passportValidUntil' | 'tenantEmail' | 'tenantPhone'
  | 'propertyAddress' | 'roomNo' | 'floorNo' | 'bed' | 'rent' | 'deposit',
  string
>

/** "20/11/2026" -> "20.11.2026"; '' when not a DD/MM/YYYY date. */
const polishDate = (dmy: unknown) => {
  const m = String(dmy ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[1]}.${m[2]}.${m[3]}` : ''
}

/** "Bukowiecka 11" + "Targowek ,Warsaw ,Poland" -> "Bukowiecka 11, Targowek, Warsaw, Poland" */
export const propertyAddress = (property: { name?: string; location?: string } | null | undefined) =>
  [property?.name, ...String(property?.location || '').split(',')]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ')

/**
 * Values for the agreement from a bed hold, its property and the student's record.
 * Contract date and start date are the arrival date. Floors count from 0 (ground floor);
 * units outside floors have no floor number. Rent and deposit are the ones agreed at booking;
 * a booking made before the unit had a rent uses the unit's current rent and deposit (`unit`,
 * its v1-room-overrides document). The deposit defaults to the full price, like the unit's.
 */
export function agreementValues(booking: any, property: any, student: any, unit?: { roomPrice?: string; deposit?: string } | null): AgreementValues {
  const arrival = polishDate(booking.arrivalDate || student?.arrivalDate)
  const { roomNum } = splitOverrideKey(String(booking.overrideKey || ''))
  const floor = /^\d+$/.test(roomNum) ? Math.floor(Number(roomNum) / 100) - 1 : null
  const price = typeof booking.price === 'number' ? booking.price : parseAmount(unit?.roomPrice)
  const deposit = typeof booking.deposit === 'number' ? booking.deposit : typeof booking.price === 'number' ? booking.price : unitDeposit(unit)
  const phone = String(booking.phone || booking.whatsapp || student?.whatsapp || '').replace(/\D/g, '')
  return {
    contractDate: arrival,
    startDate: arrival,
    tenantName: String(student?.name || booking.name || '').trim(),
    // Entered by the student after payment (process to follow); blank lines until then
    passportNo: String(student?.passportNumber || ''),
    passportValidUntil: polishDate(student?.passportValidUntil),
    tenantEmail: String(student?.email || booking.email || ''),
    tenantPhone: phone ? `+${phone}` : '',
    propertyAddress: propertyAddress(property),
    roomNo: roomNum,
    floorNo: floor !== null && floor >= 0 ? String(floor) : '',
    bed: String(booking.bed || ''),
    rent: price !== null && price > UTILITIES_PLN ? String(price - UTILITIES_PLN) : '',
    deposit: deposit !== null ? String(deposit) : '',
  }
}

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/** Fill the template's {{name|blank}} tags; an empty value keeps the blank line. */
export function fillAgreement(template: Uint8Array, values: Partial<AgreementValues>): Uint8Array {
  const files = unzipSync(template)
  const xml = strFromU8(files['word/document.xml'])
  files['word/document.xml'] = strToU8(
    xml.replace(/\{\{(\w+)\|([^}]*)\}\}/g, (_, name: string, blank: string) => {
      const value = String((values as Record<string, string>)[name] ?? '').trim()
      return value ? escapeXml(value) : blank
    }),
  )
  return zipSync(files, { level: 6 })
}

/** "Umowa-najmu-KLS-ABC234-Anna-Nowak.docx" (ASCII only, for the download header). */
export const agreementFileName = (booking: any) =>
  `Umowa-najmu-${booking.ref}-${String(booking.name || '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')}`.replace(/-+$/, '') + '.docx'
