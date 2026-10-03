import { randomInt } from 'crypto'
import { NextResponse } from 'next/server'

import { parseSharing, SHARING_LABELS } from '@/lib/botRooms'
import { botPayload, checkBotKey, clean, loadInventory, normalizePhone } from '@/lib/botServer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/bot/call   Header: x-api-key: <BOT_API_KEY>
 * Body: { name, whatsapp, arrivalDate?, sharing?, unit?, notes? }
 *
 * Records a "Request a call" in v1-bot-bookings and returns the student and admin messages.
 */
export async function POST(request: Request) {
  const denied = checkBotKey(request)
  if (denied) return denied

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON body required' }, { status: 400 })
  }
  const whatsapp = normalizePhone(body.whatsapp)
  if (!whatsapp) return NextResponse.json({ ok: false, error: 'whatsapp is required' }, { status: 400 })

  const name = clean(body.name, 120)
  const arrivalDate = clean(body.arrivalDate, 40)
  const sharing = parseSharing(body.sharing)
  const unitId = clean(body.unit)
  const notes = clean(body.notes, 1000)

  try {
    const payload = await botPayload()
    const unit = unitId ? (await loadInventory(payload)).units.find((u) => u.unit === unitId) : undefined
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    const ref = `KLC-${Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('')}`

    await payload.create({
      collection: 'v1-bot-bookings',
      overrideAccess: true,
      data: {
        ref,
        type: 'call_request',
        status: 'call_requested',
        name,
        whatsapp,
        arrivalDate,
        sharing: sharing ?? undefined,
        unit: unit?.unit,
        overrideKey: unit?.overrideKey,
        propertyId: unit?.propertyId,
        hostel: unit?.hostel,
        room: unit?.label,
        floor: unit?.floorName,
        notes,
      } as any,
    })

    const sharingText = sharing ? SHARING_LABELS[sharing] || `${sharing} share` : '-'
    return NextResponse.json({
      ok: true,
      ref,
      message: 'Thank you! 🙏 The concerned person will contact you within 24 hours.',
      adminMessage:
        `📞 Call request (WhatsApp bot)\n\n` +
        `Ref: ${ref}\n` +
        `Name: ${name || '-'}\n` +
        `WhatsApp: +${whatsapp}\n` +
        `Arrival: ${arrivalDate || '-'}\n` +
        `Sharing: ${sharingText}\n` +
        (unit ? `Interested in: ${unit.label} — ${unit.hostel} (${unit.floorName})\n` : '') +
        `\nPlease call within 24 hours.`,
    })
  } catch (error) {
    console.error('Bot call API error:', error)
    return NextResponse.json({ ok: false, message: 'Sorry, something went wrong. Please try again.' }, { status: 500 })
  }
}
