import { NextResponse } from 'next/server'

import { parseSharing, searchRooms } from '@/lib/botRooms'
import { botPayload, checkBotKey, loadInventory } from '@/lib/botServer'

export const dynamic = 'force-dynamic'

/**
 * GET /api/bot/rooms?sharing=Two%20share[&hostel=<propertyId>]
 * Header: x-api-key: <BOT_API_KEY>
 *
 * `sharing` accepts the list answer ("Two share") or a number (2); `beds` is an alias.
 * Response `status` tells the bot what to do next:
 *   rooms                -> show gallery / rooms
 *   choose_hostel        -> more than 10 matches: show `hostels`, then call again with &hostel=<value>
 *   choose_other_sharing -> none free for this sharing: show `otherSharing`
 *   not_available        -> everything is full
 */
export async function GET(request: Request) {
  const denied = checkBotKey(request)
  if (denied) return denied

  const params = new URL(request.url).searchParams
  const sharing = parseSharing(params.get('sharing') ?? params.get('beds'))
  if (!sharing) {
    return NextResponse.json({ ok: false, error: 'sharing is required, e.g. sharing=2 or sharing=Two share' }, { status: 400 })
  }

  try {
    const payload = await botPayload()
    const { units } = await loadInventory(payload)
    const hostel = params.get('hostel')?.trim() || null
    return NextResponse.json({ ok: true, ...searchRooms(units, sharing, hostel) })
  } catch (error) {
    console.error('Bot rooms API error:', error)
    return NextResponse.json({ ok: false, error: 'Could not load rooms' }, { status: 500 })
  }
}
