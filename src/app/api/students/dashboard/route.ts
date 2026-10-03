import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import configPromise from '@payload-config';

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config: configPromise });

    // Since we're using a mock auth token, we'll just fetch a random student or hardcoded mock 
    // real implementation would decode the token and find the specific student.
    const tenancies = await payload.find({
      collection: 'tenancies',
      where: { status: { equals: 'ACTIVE' } },
      limit: 1,
    });
    
    const notices = await payload.find({
      collection: 'notices',
      where: { target_audience: { equals: 'ALL_TENANTS' } },
      limit: 5,
    });

    const maintenance = await payload.find({
      collection: 'maintenance-requests',
      where: { status: { not_equals: 'CLOSED' } },
      limit: 1, // Just to get a count ideally
    });

    return NextResponse.json({ 
      student: { name: 'Student' }, 
      activeTenancy: tenancies.docs[0] || null, 
      announcements: notices.docs,
      events: [],
      maintenanceTicketsCount: maintenance.totalDocs || 0
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
