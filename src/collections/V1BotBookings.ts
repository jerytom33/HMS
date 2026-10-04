import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'
import { isStaff } from '../access'
import { releaseHeldBed } from '../lib/botHolds'

/**
 * When a bed hold is cancelled (by staff, or by the expiry cron), give its bed back:
 * clear bedStatuses[bedIndex] on the unit and recompute its counts. A hold that
 * becomes 'paid' keeps its bed.
 */
const releaseBedOnCancel: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (
    operation === 'update' &&
    doc.type === 'bed_hold' &&
    previousDoc?.status === 'held' &&
    doc.status === 'cancelled' &&
    doc.overrideKey &&
    typeof doc.bedIndex === 'number'
  ) {
    const transactionID = await req.transactionID
    const session = transactionID ? (req.payload.db as any).sessions?.[transactionID] : undefined
    const released = await releaseHeldBed(req.payload, doc.overrideKey, doc.bedIndex, session)
    req.payload.logger.info(
      released
        ? `Bot hold ${doc.ref} cancelled: released bed ${doc.bedIndex} of ${doc.overrideKey}`
        : `Bot hold ${doc.ref} cancelled: bed ${doc.bedIndex} of ${doc.overrideKey} was already free or assigned to a student`,
    )
  }
  return doc
}

// Bed holds and call requests made through the WhatsApp bot (/api/bot/*).
// A 'held' booking keeps its bed marked taken in v1-room-overrides until staff
// confirm payment or it is cancelled (by staff, or after HOLD_EXPIRY_HOURS by the cron).
export const V1BotBookings: CollectionConfig = {
  slug: 'v1-bot-bookings',
  admin: {
    useAsTitle: 'ref',
    defaultColumns: ['ref', 'status', 'name', 'phone', 'hostel', 'room', 'arrivalDate', 'createdAt'],
  },
  access: {
    // Personal data: staff only. The bot writes through the server-side API with its own key.
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    afterChange: [releaseBedOnCancel],
  },
  fields: [
    { name: 'ref', type: 'text', required: true, unique: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'bed_hold',
      options: [
        { label: 'Bed hold', value: 'bed_hold' },
        { label: 'Call request', value: 'call_request' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'held',
      options: [
        { label: 'Held (awaiting payment)', value: 'held' },
        { label: 'Paid', value: 'paid' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Call requested', value: 'call_requested' },
        { label: 'Called', value: 'called' },
      ],
    },
    { name: 'name', type: 'text' },
    { name: 'whatsapp', type: 'text', index: true },
    // Number to call; the WhatsApp number unless the student gave another one
    { name: 'phone', type: 'text' },
    {
      name: 'gender',
      type: 'select',
      options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' },
      ],
    },
    // As the student typed it, DD/MM/YYYY
    { name: 'arrivalDate', type: 'text' },
    { name: 'sharing', type: 'number' },
    { name: 'unit', type: 'text' },
    { name: 'overrideKey', type: 'text', index: true },
    { name: 'propertyId', type: 'text' },
    { name: 'hostel', type: 'text' },
    { name: 'room', type: 'text' },
    { name: 'floor', type: 'text' },
    { name: 'bedIndex', type: 'number' },
    { name: 'bed', type: 'text' },
    { name: 'price', type: 'number' },
    { name: 'notes', type: 'textarea' },
  ],
}
