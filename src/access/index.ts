import type { Access } from 'payload'

export const isAdmin: Access = ({ req: { user } }) => {
  return Boolean(user?.roles?.includes('admin'))
}

export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.roles?.includes('admin')) return true
  return {
    id: {
      equals: user.id,
    },
  }
}

/** Whether a signed-in user has a staff role (for route handlers outside Payload's access control). */
export const isStaffUser = (user: any) => {
  const staffRoles = ['admin', 'manager', 'reception', 'maintenance', 'accountant', 'warden']
  return Boolean(user?.roles?.some((role: string) => staffRoles.includes(role)))
}

export const isStaff: Access = ({ req: { user } }) => isStaffUser(user)

export const isStaffOfProperty: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.roles?.includes('admin')) return true

  const staffRoles = ['manager', 'reception', 'maintenance', 'accountant', 'warden']
  if (user.roles?.some((role: string) => staffRoles.includes(role))) {
    if (user.properties && user.properties.length > 0) {
      return {
        property: {
          in: user.properties.map((p: any) => (typeof p === 'object' ? p.id : p)),
        },
      }
    }
    return false // If staff but assigned no properties, deny access
  }
  return false
}

export const anyone: Access = () => true
