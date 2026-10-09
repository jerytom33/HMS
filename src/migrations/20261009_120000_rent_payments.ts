import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

/** Monthly rent payments: one per booking and due date, and quick lookups by booking. */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const collection = payload.db.connection.collection('v1-rent-payments')
  await collection.createIndex({ bookingId: 1, dueDate: 1 }, { unique: true })
  await collection.createIndex({ bookingId: 1 })
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Indexes are harmless to keep.
}
