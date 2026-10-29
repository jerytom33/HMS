import { NextResponse } from 'next/server'

import { isStaffUser } from '@/access'
import { botPayload } from '@/lib/botServer'
import { deleteOrphans, findOrphans } from '@/lib/orphanRecords'

export const dynamic = 'force-dynamic'

async function staffPayload(request: Request) {
  const payload = await botPayload()
  const { user } = await payload.auth({ headers: request.headers })
  return isStaffUser(user) ? { payload, user } : null
}

/** GET /api/staff/students/leftovers (staff login required): records of students that no longer exist. */
export async function GET(request: Request) {
  const staff = await staffPayload(request)
  if (!staff) return NextResponse.json({ ok: false, error: 'Staff login required' }, { status: 401 })
  return NextResponse.json({ ok: true, ...(await findOrphans(staff.payload)) })
}

/**
 * POST /api/staff/students/leftovers { whatsapps: string[], assignments: boolean, files: boolean }
 * Deletes the picked leftovers. Cannot be undone.
 */
export async function POST(request: Request) {
  const staff = await staffPayload(request)
  if (!staff) return NextResponse.json({ ok: false, error: 'Staff login required' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const whatsapps = Array.isArray(body?.whatsapps) ? body.whatsapps.map(String).slice(0, 1000) : []
  const pick = { whatsapps, assignments: body?.assignments === true, files: body?.files === true }
  if (!pick.whatsapps.length && !pick.assignments && !pick.files) {
    return NextResponse.json({ ok: false, error: 'Nothing selected' }, { status: 400 })
  }

  const deleted = await deleteOrphans(staff.payload, pick)
  staff.payload.logger.info(`Leftover student records deleted by ${(staff.user as any)?.email || staff.user?.id}: ${JSON.stringify(deleted)}`)
  return NextResponse.json({ ok: true, deleted })
}
