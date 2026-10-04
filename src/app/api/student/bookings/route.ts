import { NextResponse } from 'next/server'

import { depositText } from '@/lib/botRooms'
import { formatPLN } from '@/lib/currency'
import { botPayload } from '@/lib/botServer'
import { studentFromRequest } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/** GET /api/student/bookings: the signed-in student's bed holds (from the bot and the portal). */
export async function GET(request: Request) {
  const payload = await botPayload()
  const student = await studentFromRequest(payload, request)
  if (!student) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })

  const bookings = await payload.find({
    collection: 'v1-bot-bookings',
    overrideAccess: true,
    depth: 0,
    limit: 50,
    sort: '-createdAt',
    where: { whatsapp: { equals: student.whatsapp }, type: { equals: 'bed_hold' } },
  })
  return NextResponse.json({
    ok: true,
    bookings: (bookings.docs as any[]).map((b) => ({
      ref: b.ref,
      status: b.status,
      hostel: b.hostel,
      room: b.room,
      floor: b.floor,
      bed: b.bed,
      arrivalDate: b.arrivalDate,
      price: typeof b.price === 'number' ? `${formatPLN(b.price)}/month` : 'Price on request',
      deposit: depositText(b.deposit),
      createdAt: b.createdAt,
    })),
  })
}
