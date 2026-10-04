import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

/**
 * The student portal and the WhatsApp bot find students by v1-students.whatsapp.
 * Production runs with Mongoose autoIndex off, so create the index explicitly.
 * Index builds can't run inside the migration's transaction, so no session here.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const Students = payload.db.collections['v1-students']
  await Students.createIndexes()
  const names = (await Students.collection.indexes()).map((i: any) => i.name)
  payload.logger.info(`v1-students indexes: ${names.join(', ')}`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Indexes are harmless to keep; nothing to undo.
}
