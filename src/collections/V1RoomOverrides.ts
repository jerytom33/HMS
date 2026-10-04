import type { CollectionConfig } from 'payload'
import { isStaff } from '../access'

export const V1RoomOverrides: CollectionConfig = {
  slug: 'v1-room-overrides',
  admin: {
    useAsTitle: 'overrideKey',
  },
  access: {
    // Public listing for the website and bot; changes need a staff login
    read: () => true,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  fields: [
    { name: 'overrideKey', type: 'text', required: true, unique: true },
    // Optional display name; the room number in overrideKey stays the unit's identity
    { name: 'roomName', type: 'text' },
    {
      name: 'unitType',
      type: 'select',
      required: true,
      defaultValue: 'room',
      options: [
        { label: 'Room', value: 'room' },
        { label: 'Studio', value: 'studio' },
        { label: 'Apartment', value: 'apartment' },
      ],
    },
    // Who may stay in this unit; 'inherit' uses the property's setting
    {
      name: 'genderPolicy',
      type: 'select',
      defaultValue: 'inherit',
      options: [
        { label: 'Same as property', value: 'inherit' },
        { label: 'Mixed', value: 'mixed' },
        { label: 'Male only', value: 'male' },
        { label: 'Female only', value: 'female' },
      ],
    },
    // Apartments only: rooms inside the apartment, [{ name, beds }]
    { name: 'subRooms', type: 'json' },
    // [{ name, included, shared? }], e.g. Kitchen / Washroom / Washing Machine / WiFi
    { name: 'amenities', type: 'json' },
    // Studios/apartments outside any floor; their overrideKey is `${propertyId}-S${n}`
    { name: 'standalone', type: 'checkbox', defaultValue: false },
    { name: 'propertyId', type: 'text', index: true },
    { name: 'status', type: 'text' },
    { name: 'beds', type: 'number' },
    { name: 'freeBeds', type: 'number' },
    { name: 'filledBeds', type: 'number' },
    { name: 'bedStatuses', type: 'json' },
    // Per bed: 'independent' | 'bunk' (missing = independent)
    { name: 'bedTypes', type: 'json' },
    // Per bed: 'lower' | 'upper' for bunk beds, null otherwise
    { name: 'bunkPositions', type: 'json' },
    { name: 'bedOccupants', type: 'json' },
    { name: 'bedImages', type: 'json' },
    { name: 'bedDescriptions', type: 'json' },
    // Monthly rent in PLN as a plain number string (e.g. '1250'); shown as 'Rent'
    { name: 'roomPrice', type: 'text' },
    // Security deposit in PLN as a plain number string (e.g. '2500')
    { name: 'deposit', type: 'text' },
    { name: 'roomFacilitiesList', type: 'json' },
    { name: 'roomFacilitiesImages', type: 'json' },
    { name: 'roomFacilitiesDescription', type: 'text' },
    { name: 'roomFacilitiesDescriptions', type: 'json' },
  ],
}
