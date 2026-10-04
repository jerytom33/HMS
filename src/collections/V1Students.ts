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
    // Planned arrival as DD/MM/YYYY, from the WhatsApp bot (checked: future, within 6 months)
    { name: 'arrivalDate', type: 'text' },
    { name: 'address', type: 'text' },
    { name: 'course', type: 'text' },
    { name: 'yearOfStudy', type: 'text' },
    { name: 'emergencyName', type: 'text' },
    { name: 'emergencyPhone', type: 'text' },
    { name: 'emergencyRelation', type: 'text' },
    // Set when the student sets a password from the personal link the bot sent to their WhatsApp
    { name: 'phoneVerifiedAt', type: 'date', admin: { readOnly: true } },
    // Hash of the portal password the student set from their personal link; never readable through any API
    { name: 'passwordHash', type: 'text', access: { read: () => false, create: () => false, update: () => false }, admin: { hidden: true } },
    // Goes up with every new password; ends older personal links and sessions
    { name: 'passwordVersion', type: 'number', defaultValue: 0, admin: { readOnly: true } },
  ],
}
