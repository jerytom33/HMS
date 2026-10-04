import { NextResponse } from 'next/server'

import { GENDER_LABELS, parseGender } from '@/lib/botRooms'
import { botPayload, checkBotKey, clean } from '@/lib/botServer'
import { linkToken, normalizeWhatsapp, parseArrivalDate, saveStudentFromBot } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/bot/student   Header: x-api-key: <BOT_API_KEY>
 * Body: { whatsapp, name?, gender?, arrivalDate? }   (the bot collects nothing else)
 *
 * Creates or updates the student behind a WhatsApp number with what the bot collected.
 * The gender ("Male", "Female", "Other") decides which rooms the student sees in the portal.
 * `arrivalDate` (DD/MM/YYYY) is saved only when it is after today and within 6 months;
 * otherwise `arrivalOk` is false and `arrivalMessage` tells the student which dates work.
 * Once name, gender and a valid arrival date are saved, `portalLink` is the student's personal
 * link (valid 7 days) to see their rooms and book; until then it is ''.
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
      arrivalDate: arrival?.ok ? arrival.date : null,
    })
    const saved = parseGender(student.gender)
    const registered = Boolean(student.name && saved && parseArrivalDate(student.arrivalDate).ok)
    const portalLink = registered
      ? `${new URL(request.url).origin}/student/start?t=${linkToken(String(student.id), normalizeWhatsapp(student.whatsapp) || whatsapp)}`
      : ''
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
      portalLink,
    })
  } catch (error) {
    console.error('Bot student API error:', error)
    return NextResponse.json({ ok: false, error: 'Could not save the student' }, { status: 500 })
  }
}
