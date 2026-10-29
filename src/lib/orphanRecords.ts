// Records left behind by students that were deleted: bookings (and their rent payments and lease
// agreements) whose WhatsApp number no student has any more, beds still assigned to a missing
// student, and passport copies / photos of a missing student. Staff review them on
// /staff/students/leftovers and delete the ones they pick.
import type { Payload } from 'payload'

import { fitBedStatuses } from './botRooms'
import { OVERRIDES, releaseHeldBed, unitBedTotal } from './botHolds'
import { normalizeWhatsapp } from './studentAuth'

const STUDENTS = 'v1-students'
const BOOKINGS = 'v1-bot-bookings'
const RENT_PAYMENTS = 'v1-rent-payments'
const AGREEMENTS = 'lease-agreements'
const PASSPORT_COPIES = 'passport-copies'
const STUDENT_PHOTOS = 'student-photos'

export type OrphanPerson = {
  whatsapp: string
  name: string
  bookings: { id: string; ref: string; type: string; status: string; place: string; createdAt: string }[]
  rentPayments: number
  agreements: number
}

export type OrphanAssignment = { overrideKey: string; bedIndex: number; studentId: string }

export type OrphanReport = {
  people: OrphanPerson[]
  /** Beds assigned (bedOccupants) to a student id that no longer exists. */
  assignments: OrphanAssignment[]
  /** Student ids with a stored passport copy or photo but no student. */
  files: string[]
}

export type OrphanDeleteResult = {
  bookings: number
  rentPayments: number
  agreements: number
  assignments: number
  files: number
}

const db = (payload: Payload) => (payload.db as any).connection

async function existingStudents(payload: Payload) {
  const found = await payload.find({ collection: STUDENTS, overrideAccess: true, depth: 0, pagination: false })
  const ids = new Set<string>()
  const numbers = new Set<string>()
  for (const s of found.docs as any[]) {
    ids.add(String(s.id))
    for (const n of [s.whatsapp, s.phone]) {
      const digits = normalizeWhatsapp(n || '')
      if (digits) numbers.add(digits)
    }
  }
  return { ids, numbers }
}

/** Everything that belongs to a student who no longer exists. Read-only. */
export async function findOrphans(payload: Payload): Promise<OrphanReport> {
  const { ids, numbers } = await existingStudents(payload)

  const bookings = (await payload.find({ collection: BOOKINGS, overrideAccess: true, depth: 0, pagination: false, sort: '-createdAt' })).docs as any[]
  const byNumber = new Map<string, OrphanPerson>()
  for (const b of bookings) {
    const whatsapp = normalizeWhatsapp(b.whatsapp || '')
    if (!whatsapp || numbers.has(whatsapp)) continue
    const person: OrphanPerson = byNumber.get(whatsapp) || { whatsapp, name: b.name || '', bookings: [], rentPayments: 0, agreements: 0 }
    if (!person.name && b.name) person.name = b.name
    person.bookings.push({
      id: String(b.id),
      ref: b.ref || '',
      type: b.type || '',
      status: b.status || '',
      place: [b.hostel, b.room, b.bed].filter(Boolean).join(' · '),
      createdAt: b.createdAt || '',
    })
    byNumber.set(whatsapp, person)
  }

  const people = [...byNumber.values()]
  const bookingIds = people.flatMap((p) => p.bookings.map((b) => b.id))
  if (bookingIds.length) {
    const rents = (await payload.find({ collection: RENT_PAYMENTS, overrideAccess: true, depth: 0, pagination: false, where: { bookingId: { in: bookingIds } } })).docs as any[]
    const agreements = await db(payload).collection(AGREEMENTS).find({ bookingId: { $in: bookingIds } }, { projection: { bookingId: 1 } }).toArray()
    for (const p of people) {
      const own = new Set(p.bookings.map((b) => b.id))
      p.rentPayments = rents.filter((r) => own.has(String(r.bookingId))).length
      p.agreements = agreements.filter((a: any) => own.has(String(a.bookingId))).length
    }
  }

  const overrides = await db(payload).collection(OVERRIDES).find({}, { projection: { overrideKey: 1, bedOccupants: 1 } }).toArray()
  const assignments: OrphanAssignment[] = []
  for (const o of overrides) {
    ;(o.bedOccupants || []).forEach((occupant: unknown, bedIndex: number) => {
      const studentId = occupant ? String(occupant) : ''
      if (studentId && !ids.has(studentId)) assignments.push({ overrideKey: o.overrideKey, bedIndex, studentId })
    })
  }

  const fileOwners = new Set<string>()
  for (const name of [PASSPORT_COPIES, STUDENT_PHOTOS]) {
    const docs = await db(payload).collection(name).find({}, { projection: { studentId: 1 } }).toArray()
    for (const d of docs) if (d.studentId && !ids.has(String(d.studentId))) fileOwners.add(String(d.studentId))
  }

  return { people, assignments, files: [...fileOwners] }
}

/** Free this unit's beds held by students that no longer exist and recompute its counts. */
export function releaseMissingOccupants(doc: any, missing: Set<string>) {
  const total = unitBedTotal(doc)
  const bedStatuses = fitBedStatuses(doc, total)
  const bedOccupants = Array.from({ length: total }, (_, i) => doc.bedOccupants?.[i] ?? null)
  let released = 0
  bedOccupants.forEach((occupant, i) => {
    if (occupant && missing.has(String(occupant))) {
      bedOccupants[i] = null
      bedStatuses[i] = false
      released += 1
    }
  })
  const filledBeds = bedStatuses.filter(Boolean).length
  const freeBeds = total - filledBeds
  const status = doc.status === 'maintenance' ? 'maintenance' : freeBeds === 0 && total > 0 ? 'occupied' : 'available'
  return { released, bedStatuses, bedOccupants, filledBeds, freeBeds, status }
}

/**
 * Delete the leftovers staff picked: the bookings (with rent payments and agreements) of the
 * given WhatsApp numbers, and optionally the bed assignments and files of missing students.
 * Everything is checked again here, so a number that belongs to a student now is skipped.
 */
export async function deleteOrphans(payload: Payload, pick: { whatsapps: string[]; assignments: boolean; files: boolean }): Promise<OrphanDeleteResult> {
  const report = await findOrphans(payload)
  const wanted = new Set(pick.whatsapps.map((n) => normalizeWhatsapp(n)))
  const people = report.people.filter((p) => wanted.has(p.whatsapp))
  const result: OrphanDeleteResult = { bookings: 0, rentPayments: 0, agreements: 0, assignments: 0, files: 0 }

  for (const p of people) {
    // A held or paid bed hold still marks its bed taken; give it back first
    for (const b of p.bookings) {
      const doc: any = await payload.findByID({ collection: BOOKINGS, id: b.id, overrideAccess: true, depth: 0 }).catch(() => null)
      if (doc?.type === 'bed_hold' && (doc.status === 'held' || doc.status === 'paid') && doc.overrideKey && typeof doc.bedIndex === 'number') {
        await releaseHeldBed(payload, doc.overrideKey, doc.bedIndex)
      }
    }
    const ids = p.bookings.map((b) => b.id)
    const rents = await payload.delete({ collection: RENT_PAYMENTS, overrideAccess: true, where: { bookingId: { in: ids } } })
    result.rentPayments += rents.docs.length
    const agreements = await db(payload).collection(AGREEMENTS).deleteMany({ bookingId: { $in: ids } })
    result.agreements += agreements.deletedCount || 0
    const bookings = await payload.delete({ collection: BOOKINGS, overrideAccess: true, where: { id: { in: ids } } })
    result.bookings += bookings.docs.length
  }

  if (pick.assignments && report.assignments.length) {
    const missing = new Set(report.assignments.map((a) => a.studentId))
    const keys = [...new Set(report.assignments.map((a) => a.overrideKey))]
    const Model = (payload.db as any).collections[OVERRIDES].collection
    for (const overrideKey of keys) {
      const doc = await Model.findOne({ overrideKey })
      if (!doc) continue
      const { released, ...fields } = releaseMissingOccupants(doc, missing)
      if (!released) continue
      await Model.updateOne({ overrideKey }, { $set: { ...fields, updatedAt: new Date() } })
      result.assignments += released
    }
  }

  if (pick.files && report.files.length) {
    for (const name of [PASSPORT_COPIES, STUDENT_PHOTOS]) {
      const deleted = await db(payload).collection(name).deleteMany({ studentId: { $in: report.files } })
      result.files += deleted.deletedCount || 0
    }
  }

  return result
}
