import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

import { isStaffUser } from '@/access'
import { botPayload } from '@/lib/botServer'
import { agreementFileName, agreementValues, fillAgreement } from '@/lib/leaseAgreement'
import { findStudentByWhatsapp } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/staff/bookings/:id/agreement (staff login required)
 * The lease agreement for a bed hold, filled in from the booking, its property and the
 * student's record, as an editable Word file to print.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await botPayload()
  const { user } = await payload.auth({ headers: request.headers })
  if (!isStaffUser(user)) return NextResponse.json({ ok: false, error: 'Staff login required' }, { status: 401 })

  const { id } = await params
  let booking: any
  try {
    booking = await payload.findByID({ collection: 'v1-bot-bookings', id, overrideAccess: true, depth: 0 })
  } catch {
    booking = null
  }
  if (!booking || booking.type !== 'bed_hold') return NextResponse.json({ ok: false, error: 'Booking not found' }, { status: 404 })

  const [property, student] = await Promise.all([
    booking.propertyId
      ? payload.findByID({ collection: 'v1-properties', id: booking.propertyId, overrideAccess: true, depth: 0 }).catch(() => null)
      : null,
    booking.whatsapp ? findStudentByWhatsapp(payload, booking.whatsapp) : null,
  ])

  const template = await readFile(path.join(process.cwd(), 'src/templates/lease-agreement.docx'))
  const file = fillAgreement(new Uint8Array(template), agreementValues(booking, property, student))
  return new Response(Buffer.from(file), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${agreementFileName(booking)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
