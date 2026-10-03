import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

/**
 * Adds property types (rooms / studio / apartment) and floor names to v1-properties.
 * Existing properties default to 'rooms' and get one empty name per floor.
 * Room names live on v1-room-overrides.roomName and need no backfill.
 */
export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  const Properties = payload.db.collections['v1-properties']

  const typed = await Properties.updateMany(
    { propertyType: { $exists: false } },
    { $set: { propertyType: 'rooms' } },
    { session },
  )
  payload.logger.info(`propertyType backfilled on ${typed.modifiedCount} properties`)

  const unnamed = await Properties.find({ floorNames: { $exists: false } }, { floors: 1 }, { session }).lean()
  for (const doc of unnamed) {
    const floors = Math.max(Number(doc.floors) || 1, 1)
    await Properties.updateOne(
      { _id: doc._id },
      { $set: { floorNames: Array.from({ length: floors }, () => '') } },
      { session },
    )
  }
  payload.logger.info(`floorNames backfilled on ${unnamed.length} properties`)
}

export async function down({ payload, session }: MigrateDownArgs): Promise<void> {
  await payload.db.collections['v1-properties'].updateMany(
    {},
    { $unset: { propertyType: '', floorNames: '' } },
    { session },
  )
}
