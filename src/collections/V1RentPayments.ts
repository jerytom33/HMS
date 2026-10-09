import type { CollectionConfig } from 'payload'
import { isStaff } from '../access'

// Monthly rent payments staff record for a booking with a lease agreement: one per due date
// (see src/lib/rent.ts for the schedule). Staff only.
export const V1RentPayments: CollectionConfig = {
  slug: 'v1-rent-payments',
  admin: {
    useAsTitle: 'ref',
    defaultColumns: ['ref', 'name', 'dueDate', 'amount', 'paidAt', 'method'],
  },
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  fields: [
    // The v1-bot-bookings document this rent belongs to
    { name: 'bookingId', type: 'text', required: true, index: true },
    { name: 'ref', type: 'text' },
    // The period it pays: the due date, YYYY-MM-DD (unique per booking, see the migration)
    { name: 'dueDate', type: 'text', required: true },
    // PLN
    { name: 'amount', type: 'number', required: true },
    { name: 'paidAt', type: 'date', required: true },
    {
      name: 'method',
      type: 'select',
      defaultValue: 'cash',
      options: [
        { label: 'Cash', value: 'cash' },
        { label: 'BLIK', value: 'blik' },
        { label: 'Bank transfer', value: 'transfer' },
        { label: 'Other', value: 'other' },
      ],
    },
    // Copied from the booking for lists and exports
    { name: 'name', type: 'text' },
    { name: 'whatsapp', type: 'text' },
    { name: 'hostel', type: 'text' },
    { name: 'room', type: 'text' },
    { name: 'note', type: 'text' },
    { name: 'recordedBy', type: 'text' },
  ],
}
