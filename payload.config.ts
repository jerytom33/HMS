import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from './src/collections/Users'
import { Students } from './src/collections/Students'
import { People } from './src/collections/People'
import { Organizations } from './src/collections/Organizations'
import { Properties } from './src/collections/Properties'
import { Buildings } from './src/collections/Buildings'
import { Floors } from './src/collections/Floors'
import { Rooms } from './src/collections/Rooms'
import { Beds } from './src/collections/Beds'
import { Media } from './src/collections/Media'
import { Tenancies } from './src/collections/Tenancies'
import { Bookings } from './src/collections/Bookings'
import { Payments } from './src/collections/Payments'
import { Invoices } from './src/collections/Invoices'
import { Receipts } from './src/collections/Receipts'
import { Contracts } from './src/collections/Contracts'
import { Documents } from './src/collections/Documents'
import { MaintenanceRequests } from './src/collections/MaintenanceRequests'
import { StaffProfiles } from './src/collections/StaffProfiles'
import { Shifts } from './src/collections/Shifts'
import { Tasks } from './src/collections/Tasks'
import { Notices } from './src/collections/Notices'
import { Messages } from './src/collections/Messages'
import { Feedback } from './src/collections/Feedback'
import { Assets } from './src/collections/Assets'
import { Visitors } from './src/collections/Visitors'
import { AccessLogs } from './src/collections/AccessLogs'
import { NotificationLogs } from './src/collections/NotificationLogs'
import { Incidents } from './src/collections/Incidents'
import { Events } from './src/collections/Events'
import { EventRSVPs } from './src/collections/EventRSVPs'
import { Reports } from './src/collections/Reports'
import { SystemAuditLogs } from './src/collections/SystemAuditLogs'
import { IntegrationLogs } from './src/collections/IntegrationLogs'
import { V1Properties } from './src/collections/V1Properties'
import { V1Students } from './src/collections/V1Students'
import { V1RoomOverrides } from './src/collections/V1RoomOverrides'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: 'users',
  },
  collections: [
    Users,
    Students,
    People,
    Organizations,
    Properties,
    Buildings,
    Floors,
    Rooms,
    Beds,
    Media,
    Tenancies,
    Bookings,
    Payments,
    Invoices,
    Receipts,
    Contracts,
    Documents,
    MaintenanceRequests,
    StaffProfiles,
    Shifts,
    Tasks,
    Notices,
    Messages,
    Feedback,
    Assets,
    Visitors,
    AccessLogs,
    NotificationLogs,
    Incidents,
    Events,
    EventRSVPs,
    Reports,
    SystemAuditLogs,
    IntegrationLogs,
    V1Properties,
    V1Students,
    V1RoomOverrides,
  ],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
})
