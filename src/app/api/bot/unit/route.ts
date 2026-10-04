import { NextResponse } from 'next/server'

import { parseSharing, unitDetails } from '@/lib/botRooms'
import { botPayload, checkBotKey, clean, loadInventory } from '@/lib/botServer'

export const dynamic = 'force-dynamic'

/**
 * GET /api/bot/unit?unit=<room>[&bed=<bed>][&sharing=<sharing>&hostel=<hostel>]
 * `unit` and `bed` may be ids or the list titles the student tapped ("Room 402", "Bed B");
 * `sharing` and `hostel` (as sent to /api/bot/rooms) tell rooms with the same name apart.
 * Header: x-api-key: <BOT_API_KEY>
 *
 * One room's free beds (for the bed choice) and, with `bed`, the booking summary for that bed.
 * Always answers 200 with `available` for the bot to branch on.
 */
export async function GET(request: Request) {
  const denied = checkBotKey(request)
  if (denied) return denied

  const params = new URL(request.url).searchParams
  const unitId = clean(params.get('unit'))
  const bed = clean(params.get('bed'), 10)
  if (!unitId) return NextResponse.json({ ok: false, error: 'unit is required' }, { status: 400 })

  try {
    const payload = await botPayload()
    const { units } = await loadInventory(payload)
    return NextResponse.json({ ok: true, ...unitDetails(units, unitId, bed || null, { sharing: parseSharing(params.get('sharing')), hostel: params.get('hostel') }) })
  } catch (error) {
    console.error('Bot unit API error:', error)
    return NextResponse.json({ ok: false, error: 'Could not load the room' }, { status: 500 })
  }
}
