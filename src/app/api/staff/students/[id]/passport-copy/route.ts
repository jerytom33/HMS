import { NextResponse } from 'next/server'

import { isStaffUser } from '@/access'
import { botPayload } from '@/lib/botServer'
import { copyExtension, getPassportCopy } from '@/lib/passportCopy'

export const dynamic = 'force-dynamic'

/** GET /api/staff/students/:id/passport-copy (staff login required): the student's passport copy, shown in the browser. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await botPayload()
  const { user } = await payload.auth({ headers: request.headers })
  if (!isStaffUser(user)) return NextResponse.json({ ok: false, error: 'Staff login required' }, { status: 401 })

  const { id } = await params
  const copy = await getPassportCopy(payload, id)
  if (!copy) return NextResponse.json({ ok: false, error: 'No passport copy' }, { status: 404 })
  return new Response(Buffer.from(copy.data), {
    headers: {
      'Content-Type': copy.contentType,
      // HEIC can't be shown by most browsers, so it downloads; the rest open in the tab
      'Content-Disposition': `${copy.contentType === 'image/heic' ? 'attachment' : 'inline'}; filename="passport-${id}.${copyExtension(copy.contentType)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  })
}
