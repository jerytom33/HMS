import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

import { optimizedImageUrl } from '../lib/cloudinaryUpload'

// Collections whose JSON fields hold image URLs (images, floorImages, bedImages, facilities...)
const COLLECTIONS = ['v1-properties', 'v1-room-overrides', 'v1-students']

/** Deep-map every string in a JSON value. */
const mapStrings = (value: unknown, fn: (s: string) => string): unknown => {
  if (typeof value === 'string') return fn(value)
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn))
  if (value && typeof value === 'object' && !(value instanceof Date) && value.constructor === Object) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)]))
  }
  return value
}

async function rewrite({ payload, session }: MigrateUpArgs, fn: (s: string) => string) {
  for (const slug of COLLECTIONS) {
    const Model = payload.db.collections[slug]
    const docs = await Model.find({}, null, { session }).lean()
    let changed = 0
    for (const doc of docs as any[]) {
      const { _id, ...rest } = doc
      const next = mapStrings(rest, fn) as Record<string, unknown>
      const updates = Object.fromEntries(
        Object.entries(next).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(rest[k])),
      )
      if (Object.keys(updates).length) {
        await Model.updateOne({ _id }, { $set: updates }, { session, strict: false, timestamps: false })
        changed++
      }
    }
    payload.logger.info(`${slug}: image URLs updated on ${changed} documents`)
  }
}

/**
 * Stored Cloudinary image URLs point at the original file, so HEIC uploads (iPhone
 * photos) don't display in most browsers. Rewrite them to f_auto,q_auto delivery URLs.
 */
export async function up(args: MigrateUpArgs): Promise<void> {
  await rewrite(args, optimizedImageUrl)
}

export async function down(args: MigrateDownArgs): Promise<void> {
  await rewrite(args, (s) => s.replace('/image/upload/f_auto,q_auto/', '/image/upload/'))
}
