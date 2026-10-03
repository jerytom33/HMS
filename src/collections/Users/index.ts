import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrSelf, isStaff } from '../../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'username',
  },
  auth: {
    useAPIKey: true,
    loginWithUsername: {
      allowEmailLogin: true,
      requireEmail: false,
    },
  },
  access: {
    read: isStaff,
    create: isAdmin,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['admin'],
      required: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Manager', value: 'manager' },
        { label: 'Reception', value: 'reception' },
        { label: 'Maintenance', value: 'maintenance' },
        { label: 'Accountant', value: 'accountant' },
        { label: 'Warden', value: 'warden' },
      ],
      access: {
        update: ({ req: { user } }) => {
          if (!user) return false
          if (user.roles?.includes('admin')) return true
          return false
        },
      },
    },
    {
      name: 'properties',
      type: 'relationship',
      relationTo: 'properties',
      hasMany: true,
      admin: {
        description: 'The properties this staff member is authorized to manage.'
      },
      access: {
        update: ({ req: { user } }) => {
          if (!user) return false
          if (user.roles?.includes('admin')) return true
          return false
        },
      }
    }
  ],
}
