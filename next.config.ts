import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The lease agreement template is read from disk when staff generate an agreement
  outputFileTracingIncludes: {
    '/api/staff/bookings/\\[id\\]/agreement': ['./src/templates/**/*'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

export default withPayload(nextConfig)
