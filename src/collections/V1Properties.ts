import type { CollectionConfig } from 'payload'

export const V1Properties: CollectionConfig = {
  slug: 'v1-properties',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'location', type: 'text' },
    { name: 'rooms', type: 'number' },
    { name: 'floors', type: 'number' },
    { name: 'roomsPerFloor', type: 'json' },
    { name: 'isCustomBedsPerFloor', type: 'checkbox' },
    { name: 'bedsPerFloor', type: 'json' },
    { name: 'beds', type: 'number' },
    { name: 'occupancy', type: 'text' },
    { name: 'status', type: 'text' },
    { name: 'images', type: 'json' },
  ],
}
