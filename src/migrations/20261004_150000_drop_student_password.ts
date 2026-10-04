import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

/**
 * Students sign in with a one-time code sent to their WhatsApp, so the plain-text
 * v1-students.password field is gone: delete the stored values.
 * Also create the TTL index of otp-sends (the portal's code rate limits), so entries
 * expire after an hour even before the app's first code request creates it.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const Students = payload.db.collections['v1-students']
  const result = await Students.collection.updateMany({ password: { $exists: true } }, { $unset: { password: '' } })
  payload.logger.info(`Removed password from ${result.modifiedCount} students`)
  await payload.db.connection.collection('otp-sends').createIndex({ at: 1 }, { expireAfterSeconds: 3600 })
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // The deleted passwords can't be restored.
}
