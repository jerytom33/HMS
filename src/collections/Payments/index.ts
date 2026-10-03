import type { CollectionConfig } from 'payload'
import { isStaff } from '../../access'

import { allocatePaymentToInvoice } from './hooks/allocatePaymentToInvoice'

export const Payments: CollectionConfig = {
  slug: 'payments',
  admin: {
    useAsTitle: 'id',
  },
  access: {
    read: isStaff, // Expand to self later
    create: isStaff,
    update: isStaff,
    delete: () => false, // PRESERVE_FINANCIAL_HISTORY
  },
  hooks: {
    afterChange: [
      allocatePaymentToInvoice
    ]
  },
  fields: [
    {
      name: 'person',
      type: 'relationship',
      relationTo: 'people',
      required: true,
    },
    {
      name: 'property',
      type: 'relationship',
      relationTo: 'properties',
      required: true,
    },
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'bookings',
    },
    {
      name: 'tenancy',
      type: 'relationship',
      relationTo: 'tenancies',
    },
    {
      name: 'invoice',
      type: 'relationship',
      relationTo: 'invoices',
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'PLN',
      required: true,
    },
    {
      name: 'payment_method',
      type: 'select',
      options: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD'],
      defaultValue: 'CASH',
      required: true,
    },
    {
      name: 'payment_type',
      type: 'select',
      options: ['BOOKING_PAYMENT', 'SECURITY_DEPOSIT', 'RENT', 'UTILITY_CHARGE', 'LATE_FEE', 'DISCOUNT', 'REFUND'],
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: ['PENDING', 'VERIFIED', 'REJECTED'],
      defaultValue: 'PENDING',
      required: true,
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'transaction_reference',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'Unique idempotency key or provider transaction ID to prevent double-counting.',
      }
    },
  ],
}
