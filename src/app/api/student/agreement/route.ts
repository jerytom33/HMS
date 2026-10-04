import { NextResponse } from 'next/server'

import { getAgreement } from '@/lib/agreementStore'
import { botPayload } from '@/lib/botServer'
import { agreementFileName } from '@/lib/leaseAgreement'
import { studentFromRequest } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/student/agreement (student login required)
 * The signed-in student's lease agreement, exactly as staff generated it, as a Word file
 * (`?download=1` to save it). 404 until staff have generated it.
 */
export async function GET(request: Request) {
  const payload = await botPayload()
  const student = await studentFromRequest(payload, request)
  if (!student) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })

  // The student's most recent booking with a generated agreement
  const found = await payload.find({
    collection: 'v1-bot-bookings',
    overrideAccess: true,
    depth: 0,
    limit: 1,
    sort: '-agreementGeneratedAt',
    where: { whatsapp: { equals: student.whatsapp }, type: { equals: 'bed_hold' }, agreementGeneratedAt: { exists: true } },
  })
  const booking: any = found.docs[0]
  const stored = booking ? await getAgreement(payload, String(booking.id)) : null
  if (!stored) return NextResponse.json({ ok: false, error: 'Your agreement is not ready yet.' }, { status: 404 })

  const download = new URL(request.url).searchParams.get('download') === '1'
  return new Response(Buffer.from(stored.data), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${agreementFileName(booking)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
