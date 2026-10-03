import type { CollectionConfig } from 'payload'
import { isStaff } from '../access'

export const V1Properties: CollectionConfig = {
  slug: 'v1-properties',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    // Public listing for the website and bot; changes need a staff login
    read: () => true,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'location', type: 'text' },
    { name: 'rooms', type: 'number' },
    { name: 'floors', type: 'number' },
    { name: 'roomsPerFloor', type: 'json' },
    { name: 'isCustomBedsPerFloor', type: 'checkbox' },
    { name: 'bedsPerFloor', type: 'json' },
    // Per-floor display data, indexed by floor number - 1
    { name: 'floorNames', type: 'json' },
    { name: 'floorImages', type: 'json' },
    { name: 'floorFacilitiesLists', type: 'json' },
    { name: 'beds', type: 'number' },
    { name: 'occupancy', type: 'text' },
    { name: 'status', type: 'text' },
    { name: 'images', type: 'json' },
  ],
}
