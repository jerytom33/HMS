import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { listUnits, type BotOverride, type BotProperty } from './botRooms'

/**
 * The bot calls these routes with the shared key in the `x-api-key` header.
 * Returns an error response when the key is missing or wrong, null when it is valid.
 * Fails closed when BOT_API_KEY is not configured.
 */
export function checkBotKey(request: Request): NextResponse | null {
  const expected = process.env.BOT_API_KEY
  if (!expected) return NextResponse.json({ ok: false, error: 'Bot API is not configured' }, { status: 503 })
  const given = request.headers.get('x-api-key') || ''
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export const botPayload = () => getPayload({ config: configPromise })

/** Every property and room override, as plain objects. */
export async function loadInventory(payload: Payload) {
  const [properties, overrides] = await Promise.all([
    payload.find({ collection: 'v1-properties', pagination: false, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'v1-room-overrides', pagination: false, depth: 0, overrideAccess: true }),
  ])
  const props = properties.docs as unknown as BotProperty[]
  const overs = overrides.docs as unknown as BotOverride[]
  return { properties: props, overrides: overs, units: listUnits(props, overs) }
}

/** WhatsApp numbers arrive as "+48 507 873 416", "48507873416"... keep digits only. */
export const normalizePhone = (value: unknown) => String(value ?? '').replace(/\D/g, '')

export const clean = (value: unknown, max = 200) => String(value ?? '').trim().slice(0, max)
