import type { CollectionConfig } from 'payload'

export const V1Students: CollectionConfig = {
  slug: 'v1-students',
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
    { name: 'name', type: 'text' },
    { name: 'email', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'room', type: 'text' },
    { name: 'property', type: 'text' },
    { name: 'status', type: 'text' },
    { name: 'dateOfBirth', type: 'text' },
    { name: 'gender', type: 'text' },
    { name: 'address', type: 'text' },
    { name: 'course', type: 'text' },
    { name: 'yearOfStudy', type: 'text' },
    { name: 'emergencyName', type: 'text' },
    { name: 'emergencyPhone', type: 'text' },
    { name: 'emergencyRelation', type: 'text' },
    { name: 'password', type: 'text' },
  ],
}
