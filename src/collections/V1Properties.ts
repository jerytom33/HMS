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
    // Who may stay; the student portal shows students only units their gender is allowed in
    {
      name: 'genderPolicy',
      type: 'select',
      defaultValue: 'mixed',
      options: [
        { label: 'Mixed', value: 'mixed' },
        { label: 'Male only', value: 'male' },
        { label: 'Female only', value: 'female' },
      ],
    },
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
    // Facility names, e.g. ['Parking', 'Metro', 'Bus', 'Tram']
    { name: 'facilities', type: 'json' },
  ],
}
