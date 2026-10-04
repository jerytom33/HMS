import { NextResponse } from 'next/server'

import { unitDetails } from '@/lib/botRooms'
import { botPayload, checkBotKey, clean, loadInventory } from '@/lib/botServer'

export const dynamic = 'force-dynamic'

/**
 * GET /api/bot/unit?unit=<value from /api/bot/rooms>
 * Header: x-api-key: <BOT_API_KEY>
 *
 * Details of one room for the booking summary the bot shows before the student confirms.
 * Always answers 200 with `available` for the bot to branch on.
 */
export async function GET(request: Request) {
  const denied = checkBotKey(request)
  if (denied) return denied

  const unitId = clean(new URL(request.url).searchParams.get('unit'))
  if (!unitId) return NextResponse.json({ ok: false, error: 'unit is required' }, { status: 400 })

  try {
    const payload = await botPayload()
    const { units } = await loadInventory(payload)
    return NextResponse.json({ ok: true, ...unitDetails(units, unitId) })
  } catch (error) {
    console.error('Bot unit API error:', error)
    return NextResponse.json({ ok: false, error: 'Could not load the room' }, { status: 500 })
  }
}
