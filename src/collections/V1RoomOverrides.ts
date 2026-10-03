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
