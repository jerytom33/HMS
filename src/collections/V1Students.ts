import type { CollectionConfig } from 'payload'
import { isStaff } from '../access'

export const V1Students: CollectionConfig = {
  slug: 'v1-students',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    // Personal data: staff login required to read or change
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  fields: [
    { name: 'name', type: 'text' },
    { name: 'email', type: 'text' },
    { name: 'phone', type: 'text' },
    // Digits only ("48507873416"); the student portal login and the WhatsApp bot find students by it
    { name: 'whatsapp', type: 'text', index: true },
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
    // One-time portal login code (hashed) from /api/bot/login-code; never readable through any API
    { name: 'loginCodeHash', type: 'text', access: { read: () => false, create: () => false, update: () => false }, admin: { hidden: true } },
    { name: 'loginCodeExpires', type: 'date', access: { read: () => false, create: () => false, update: () => false }, admin: { hidden: true } },
    { name: 'loginCodeAttempts', type: 'number', access: { read: () => false, create: () => false, update: () => false }, admin: { hidden: true } },
  ],
}
