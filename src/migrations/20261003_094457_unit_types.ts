import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-mongodb'

import { defaultAmenities, roomNumber } from '../lib/propertyTypes'

/**
 * Unit types move from the property to each unit: a property mixes rooms, studios and
 * apartments. A property previously typed studio/apartment passes that type down to
 * each of its floor units, then v1-properties.propertyType is dropped. Units without a
 * type become rooms.
 */
export async function up({ payload, session }: MigrateUpArgs): Promise<void> {
  const Properties = payload.db.collections['v1-properties']
  const Units = payload.db.collections['v1-room-overrides']

  // propertyType is no longer in the schema, so read and unset it with strict off
  const typedProperties = await Properties.find(
    { propertyType: { $in: ['studio', 'apartment'] } },
    { propertyType: 1, floors: 1, roomsPerFloor: 1, bedsPerFloor: 1, isCustomBedsPerFloor: 1, beds: 1 },
    { session, strict: false },
  ).lean()

  let converted = 0
  for (const property of typedProperties as any[]) {
    const unitType = property.propertyType as 'studio' | 'apartment'
    const propertyId = String(property._id)
    const floors = Math.max(Number(property.floors) || 1, 1)
    for (let floor = 1; floor <= floors; floor++) {
      const count = Number(property.roomsPerFloor?.[floor - 1]) || 0
      const floorBeds =
        (property.isCustomBedsPerFloor && Number(property.bedsPerFloor?.[floor - 1])) || Number(property.beds) || 2
      for (let i = 0; i < count; i++) {
        const overrideKey = `${propertyId}-${roomNumber(floor, i)}`
        const existing: any = await Units.findOne({ overrideKey }, null, { session }).lean()
        const beds = Number(existing?.beds) || floorBeds
        const typeFields = {
          unitType,
          standalone: false,
          propertyId,
          amenities: existing?.amenities ?? defaultAmenities(unitType),
          subRooms: unitType === 'apartment' ? (existing?.subRooms ?? [{ name: 'Bedroom 1', beds }]) : [],
        }
        if (existing) {
          await Units.updateOne({ _id: existing._id }, { $set: typeFields }, { session })
        } else {
          await Units.create(
            [
              {
                overrideKey,
                ...typeFields,
                status: 'available',
                beds,
                freeBeds: beds,
                filledBeds: 0,
                bedStatuses: Array(beds).fill(false),
                bedOccupants: Array(beds).fill(null),
              },
            ],
            { session },
          )
        }
        converted++
      }
    }
  }
  payload.logger.info(`Passed property type down to ${converted} units`)

  const dropped = await Properties.updateMany(
    { propertyType: { $exists: true } },
    { $unset: { propertyType: '' } },
    { session, strict: false },
  )
  payload.logger.info(`propertyType removed from ${dropped.modifiedCount} properties`)

  const typed = await Units.updateMany(
    { unitType: { $exists: false } },
    { $set: { unitType: 'room', standalone: false } },
    { session },
  )
  payload.logger.info(`unitType set to 'room' on ${typed.modifiedCount} units`)
}

export async function down({ payload, session }: MigrateDownArgs): Promise<void> {
  await payload.db.collections['v1-room-overrides'].updateMany(
    {},
    { $unset: { unitType: '', subRooms: '', amenities: '', standalone: '', propertyId: '' } },
    { session, strict: false },
  )
  await payload.db.collections['v1-properties'].updateMany(
    { propertyType: { $exists: false } },
    { $set: { propertyType: 'rooms' } },
    { session, strict: false },
  )
}
