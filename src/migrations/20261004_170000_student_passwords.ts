import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

/**
 * Students now set a password from the bot's personal link instead of getting WhatsApp codes:
 * delete the old one-time code fields and the code-send log, and create the TTL index that
 * expires failed-login records (login-failures) after 15 minutes.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const Students = payload.db.collections['v1-students']
  const result = await Students.collection.updateMany(
    { $or: [{ loginCodeHash: { $exists: true } }, { loginCodeExpires: { $exists: true } }, { loginCodeAttempts: { $exists: true } }] },
    { $unset: { loginCodeHash: '', loginCodeExpires: '', loginCodeAttempts: '' } },
  )
  payload.logger.info(`Removed login codes from ${result.modifiedCount} students`)
  await payload.db.connection.collection('otp-sends').drop().catch(() => {})
  await payload.db.connection.collection('login-failures').createIndex({ at: 1 }, { expireAfterSeconds: 900 })
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // One-time codes expired after 10 minutes anyway; nothing to restore.
}
