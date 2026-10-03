import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

import { normalizeAmount } from '../lib/currency'

/**
 * All amounts are PLN. Unit rent/deposit were free text ("1250zl"); store them as plain
 * number strings ("1250") so the app formats them and API readers get clean numbers.
 * Also switch the currency of existing payments/properties to PLN.
 */
export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  const Units = payload.db.collections['v1-room-overrides']
  const docs = await Units.find(
    { $or: [{ roomPrice: { $nin: [null, ''] } }, { deposit: { $nin: [null, ''] } }] },
    { roomPrice: 1, deposit: 1 },
    { session },
  ).lean()

  let changed = 0
  for (const doc of docs as any[]) {
    const updates: Record<string, string> = {}
    for (const field of ['roomPrice', 'deposit'] as const) {
      const current = doc[field]
      if (typeof current !== 'string' || !current) continue
      const normalized = normalizeAmount(current)
      // Keep text we can't read a number from, rather than erasing it
      if (normalized && normalized !== current) updates[field] = normalized
    }
    if (Object.keys(updates).length) {
      await Units.updateOne({ _id: doc._id }, { $set: updates }, { session, timestamps: false })
      changed++
    }
  }
  payload.logger.info(`Rent/deposit normalised to PLN numbers on ${changed} units`)

  for (const slug of ['payments', 'properties']) {
    const res = await payload.db.collections[slug].updateMany(
      { currency: { $ne: 'PLN' } },
      { $set: { currency: 'PLN' } },
      { session, timestamps: false },
    )
    payload.logger.info(`${slug}: currency set to PLN on ${res.modifiedCount} documents`)
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Original free-text amounts and currencies are not recoverable; nothing to undo.
}
