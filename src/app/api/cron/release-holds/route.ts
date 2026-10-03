import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'

export const dynamic = 'force-dynamic'

/** Unpaid bot holds older than this are cancelled; their beds are freed by the v1-bot-bookings hook. */
const HOLD_HOURS = Number(process.env.HOLD_EXPIRY_HOURS) || 72

/**
 * GET /api/cron/release-holds — run daily by Vercel Cron (vercel.json).
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`; fails closed when CRON_SECRET is unset.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ ok: false, error: 'CRON_SECRET is not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await botPayload()
  const cutoff = new Date(Date.now() - HOLD_HOURS * 60 * 60 * 1000).toISOString()
  const expired = await payload.find({
    collection: 'v1-bot-bookings',
    overrideAccess: true,
    pagination: false,
    depth: 0,
    where: {
      type: { equals: 'bed_hold' },
      status: { equals: 'held' },
      createdAt: { less_than: cutoff },
    },
  })

  const cancelled: string[] = []
  const failed: string[] = []
  for (const hold of expired.docs as any[]) {
    try {
      // Cancelling runs the afterChange hook, which frees the bed
      await payload.update({
        collection: 'v1-bot-bookings',
        id: hold.id,
        overrideAccess: true,
        data: {
          status: 'cancelled',
          notes: [hold.notes, `Auto-cancelled ${new Date().toISOString()}: unpaid after ${HOLD_HOURS} hours.`].filter(Boolean).join('\n'),
        },
      })
      cancelled.push(hold.ref)
    } catch (error) {
      payload.logger.error(`Could not auto-cancel bot hold ${hold.ref}: ${error}`)
      failed.push(hold.ref)
    }
  }

  return NextResponse.json({ ok: failed.length === 0, holdHours: HOLD_HOURS, cancelled, failed })
}
