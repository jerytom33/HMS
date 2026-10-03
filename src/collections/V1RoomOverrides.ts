import type { CollectionConfig } from 'payload'

export const V1RoomOverrides: CollectionConfig = {
  slug: 'v1-room-overrides',
  admin: {
    useAsTitle: 'overrideKey',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    { name: 'overrideKey', type: 'text', required: true, unique: true },
    // Optional display name; the room number in overrideKey stays the room's identity
    { name: 'roomName', type: 'text' },
    { name: 'status', type: 'text' },
    { name: 'beds', type: 'number' },
    { name: 'freeBeds', type: 'number' },
    { name: 'filledBeds', type: 'number' },
    { name: 'bedStatuses', type: 'json' },
    { name: 'bedOccupants', type: 'json' },
    { name: 'bedImages', type: 'json' },
    { name: 'bedDescriptions', type: 'json' },
    { name: 'roomPrice', type: 'text' },
    { name: 'roomFacilitiesList', type: 'json' },
    { name: 'roomFacilitiesImages', type: 'json' },
    { name: 'roomFacilitiesDescription', type: 'text' },
    { name: 'roomFacilitiesDescriptions', type: 'json' },
  ],
}
