import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

/**
 * Production runs with Mongoose autoIndex off, so new collections get no indexes on
 * their own. Create v1-bot-bookings and its indexes (unique ref, whatsapp, overrideKey).
 * Index builds can't run inside the migration's transaction, so no session here.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const Bookings = payload.db.collections['v1-bot-bookings']
  await Bookings.createCollection().catch(() => {})
  await Bookings.createIndexes()
  const names = (await Bookings.collection.indexes()).map((i: any) => i.name)
  payload.logger.info(`v1-bot-bookings indexes: ${names.join(', ')}`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Indexes are harmless to keep; nothing to undo.
}
