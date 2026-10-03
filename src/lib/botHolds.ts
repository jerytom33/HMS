// Bed counts for bot holds, shared by booking (/api/bot/book), the hold release
// hook on v1-bot-bookings and the daily expiry cron.
import type { ClientSession } from 'mongoose'
import type { Payload } from 'payload'

import { fitBedStatuses, type BotOverride } from './botRooms'

export const OVERRIDES = 'v1-room-overrides'

/** Beds in a unit document; an apartment's beds are the sum of its rooms. */
export const unitBedTotal = (doc: any) =>
  doc?.unitType === 'apartment'
    ? (doc.subRooms || []).reduce((s: number, r: any) => s + (Number(r.beds) || 0), 0)
    : Number(doc?.beds) || 0

/** Rewrite freeBeds / filledBeds / status from bedStatuses after a bed changed. */
export async function syncCounts(Model: any, doc: any, session?: ClientSession) {
  const total = unitBedTotal(doc)
  const taken = fitBedStatuses(doc as BotOverride, total)
  const filled = taken.filter(Boolean).length
  const free = total - filled
  const status = doc.status === 'maintenance' ? 'maintenance' : free === 0 ? 'occupied' : 'available'
  await Model.collection.updateOne(
    { _id: doc._id },
    { $set: { freeBeds: free, filledBeds: filled, status, updatedAt: new Date() } },
    { session },
  )
}

/**
 * Free a bed that a bot hold marked taken, then recompute the unit's counts.
 * Leaves the bed alone if staff have since assigned a student to it. Returns true when released.
 */
export async function releaseHeldBed(payload: Payload, overrideKey: string, bedIndex: number, session?: ClientSession) {
  const Model = (payload.db as any).collections[OVERRIDES]
  // Native driver: no Mongoose casting on the json field's array paths.
  // `bedOccupants.<i>: null` also matches documents without an occupant at that index.
  const doc = await Model.collection.findOneAndUpdate(
    { overrideKey, [`bedStatuses.${bedIndex}`]: true, [`bedOccupants.${bedIndex}`]: null },
    { $set: { [`bedStatuses.${bedIndex}`]: false } },
    { returnDocument: 'after', session },
  )
  if (!doc) return false
  await syncCounts(Model, doc, session)
  return true
}
