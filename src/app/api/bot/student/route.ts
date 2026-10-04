import { NextResponse } from 'next/server'

import { GENDER_LABELS, parseEmail, parseGender } from '@/lib/botRooms'
import { botPayload, checkBotKey, clean } from '@/lib/botServer'
import { normalizeWhatsapp, parseArrivalDate, saveStudentFromBot } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/bot/student   Header: x-api-key: <BOT_API_KEY>
 * Body: { whatsapp, name?, gender?, email?, arrivalDate? }
 *
 * Creates or updates the student behind a WhatsApp number with what the bot collected.
 * The gender ("Male", "Female", "Other") decides which rooms the student sees in the portal.
 * `arrivalDate` (DD/MM/YYYY) is saved only when it is after today and within 6 months;
 * otherwise `arrivalOk` is false and `arrivalMessage` tells the student which dates work.
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
  const whatsapp = normalizeWhatsapp(body.whatsapp)
  if (whatsapp.length < 8) return NextResponse.json({ ok: false, error: 'whatsapp is required' }, { status: 400 })
  const gender = parseGender(body.gender)
  const arrivalGiven = body.arrivalDate !== undefined && String(body.arrivalDate).trim() !== ''
  const arrival = arrivalGiven ? parseArrivalDate(body.arrivalDate) : null

  try {
    const payload = await botPayload()
    const student = await saveStudentFromBot(payload, {
      whatsapp,
      name: clean(body.name, 120),
      gender,
      email: parseEmail(body.email),
      arrivalDate: arrival?.ok ? arrival.date : null,
    })
    const saved = parseGender(student.gender)
    return NextResponse.json({
      ok: true,
      name: student.name || '',
      gender: saved ? GENDER_LABELS[saved] : '',
      // false when a gender was sent but not recognised, so the bot can ask again
      genderUnderstood: body.gender === undefined || body.gender === '' || gender !== null,
      arrivalDate: student.arrivalDate || '',
      // false when an arrival date was sent but is not a future date within 6 months
      arrivalOk: !arrival || arrival.ok,
      arrivalMessage: arrival && !arrival.ok ? arrival.message : '',
    })
  } catch (error) {
    console.error('Bot student API error:', error)
    return NextResponse.json({ ok: false, error: 'Could not save the student' }, { status: 500 })
  }
}
