import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { isStaff } from '../access'
import { releaseHeldBed } from '../lib/botHolds'

/**
 * When a bed hold is cancelled (by staff, the student, or the expiry cron), give its bed
 * back: clear bedStatuses[bedIndex] on the unit and recompute its counts. This applies to
 * paid holds too (staff cancelling a paid booking); a bed staff assigned to a student stays
 * taken (see releaseHeldBed). A hold that becomes 'paid' keeps its bed.
 */
const releaseBedOnCancel: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (
    operation === 'update' &&
    doc.type === 'bed_hold' &&
    (previousDoc?.status === 'held' || previousDoc?.status === 'paid') &&
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
/** Record when a booking is marked paid (the Payments page lists paid bookings by this date). */
const stampPaidAt: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (data?.status === 'paid' && originalDoc?.status !== 'paid' && !data.paidAt) data.paidAt = new Date().toISOString()
  return data
}

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
    beforeChange: [stampPaidAt],
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
    // Where the hold was made: the WhatsApp bot or the student portal
    {
      name: 'source',
      type: 'select',
      defaultValue: 'bot',
      options: [
        { label: 'WhatsApp bot', value: 'bot' },
        { label: 'Student portal', value: 'portal' },
      ],
    },
    { name: 'name', type: 'text' },
    { name: 'whatsapp', type: 'text', index: true },
    // Number to call; the WhatsApp number unless the student gave another one
    { name: 'phone', type: 'text' },
    // As the student typed it in the bot, lower-cased; empty when it didn't look like an email
    { name: 'email', type: 'text' },
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
    // Whether the student agreed in the bot to the minimum stay (6 months / 1 semester)
    { name: 'minStayAgreed', type: 'checkbox', defaultValue: false },
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
    // Deposit in PLN at the time of booking, when staff have set one for the room
    { name: 'deposit', type: 'number' },
    // When staff marked the booking paid
    { name: 'paidAt', type: 'date', admin: { readOnly: true } },
    // When staff generated the lease agreement (once; the file is kept in lease-agreements)
    { name: 'agreementGeneratedAt', type: 'date', admin: { readOnly: true } },
    { name: 'notes', type: 'textarea' },
  ],
}
