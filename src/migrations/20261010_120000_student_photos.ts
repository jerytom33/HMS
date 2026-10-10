import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

/** One profile photo per student: unique index on student-photos.studentId. */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.connection.collection('student-photos').createIndex({ studentId: 1 }, { unique: true })
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // The index is harmless to keep.
}
