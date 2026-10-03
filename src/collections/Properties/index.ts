import type { CollectionConfig } from 'payload'
import { isStaff } from '../../access'

export const Properties: CollectionConfig = {
  slug: 'properties',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true, // Public can read property details
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'address',
      type: 'textarea',
    },
    {
      name: 'country',
      type: 'text',
    },
    {
      name: 'city',
      type: 'text',
    },
    {
      name: 'gps',
      type: 'point',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'whatsapp',
      type: 'text',
    },
    {
      name: 'email',
      type: 'email',
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'amenities',
      type: 'array',
      fields: [
        { name: 'name', type: 'text' }
      ]
    },
    {
      name: 'rules',
      type: 'richText',
    },
    {
      name: 'checkin_time',
      type: 'text',
    },
    {
      name: 'checkout_time',
      type: 'text',
    },
    {
      name: 'minimum_stay',
      type: 'number',
    },
    {
      name: 'maximum_stay',
      type: 'number',
    },
    {
      name: 'gender_policy',
      type: 'select',
      options: ['MIXED', 'MALE_ONLY', 'FEMALE_ONLY'],
    },
    {
      name: 'public_visibility',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'PLN',
    },
    {
      name: 'timezone',
      type: 'text',
      defaultValue: 'UTC',
    },
  ],
}
