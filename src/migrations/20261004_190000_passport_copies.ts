import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

/** One passport copy per student: unique index on passport-copies.studentId. */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.connection.collection('passport-copies').createIndex({ studentId: 1 }, { unique: true })
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // The index is harmless to keep.
}
