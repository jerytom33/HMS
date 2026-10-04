import { NextResponse } from 'next/server'

import { botPayload, checkBotKey, clean } from '@/lib/botServer'
import { CODE_MINUTES, issueLoginCode, normalizeWhatsapp, saveStudentFromBot } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/bot/login-code   Header: x-api-key: <BOT_API_KEY>
 * Body: { whatsapp, name? }
 *
 * A one-time code for the student portal login (/student/login), returned in the response.
 * The WhatsApp bot no longer uses this (the portal sends codes itself through the OTP
 * workflow); it stays behind the bot key so staff can hand a student a code by hand.
 * The code works once, for 10 minutes. Creates the student record if the number has none yet.
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

  try {
    const payload = await botPayload()
    const student = await saveStudentFromBot(payload, { whatsapp, name: clean(body.name, 120) })
    const code = await issueLoginCode(payload, student)
    const portal = `${new URL(request.url).origin}/student/login`
    return NextResponse.json({
      ok: true,
      code,
      expiresInMinutes: CODE_MINUTES,
      message: `🔐 Your login code is ${code}\n\nEnter it with this WhatsApp number at ${portal}\nIt works once and expires in ${CODE_MINUTES} minutes. Don't share it with anyone.`,
    })
  } catch (error) {
    console.error('Bot login-code API error:', error)
    return NextResponse.json({ ok: false, error: 'Could not create a login code' }, { status: 500 })
  }
}
