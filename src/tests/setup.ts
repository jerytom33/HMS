import { beforeAll, afterAll } from '@jest/globals'
import { getPayload } from 'payload'
import config from '@payload-config'

// Point TEST_DATABASE_URI at a disposable MongoDB replica set; setup wipes every collection.
process.env.DATABASE_URI = process.env.TEST_DATABASE_URI || 'mongodb://127.0.0.1:27017/hms_test'
process.env.PAYLOAD_SECRET = 'hms-test-secret-123'

beforeAll(async () => {
  // Initialize payload
  const payload = await getPayload({ config })
  
  // Wipe all collections for a fresh test state
  const collections = Object.keys(payload.collections)
  for (const slug of collections) {
    if (slug === 'users') continue // Keep admin user if seeded? Actually, wiping is better.
    await payload.delete({ collection: slug as any, where: {} })
  }
})

afterAll(async () => {
  // Optionally close connections or cleanup
})
