import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

/** One generated agreement per booking: unique index on lease-agreements.bookingId. */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.connection.collection('lease-agreements').createIndex({ bookingId: 1 }, { unique: true })
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // The index is harmless to keep.
}
