import { NextResponse } from 'next/server'

import { botPayload } from '@/lib/botServer'
import { parsePassportExpiry, parsePassportNumber, passportAllowed, passportStatus } from '@/lib/passport'
import { hasPassportCopy, MAX_COPY_BYTES, savePassportCopy, sniffCopyType } from '@/lib/passportCopy'
import { studentFromRequest } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/student/passport   multipart/form-data: passportNumber, passportValidUntil (YYYY-MM-DD), copy (file)
 * The signed-in student's passport for the lease agreement: details plus a photo or scan
 * (JPG, PNG, WebP, HEIC or PDF, up to 4 MB). Allowed once staff have marked the booking paid,
 * until staff verify it. `copy` may be left out when one was uploaded before (fixing a typo).
 * Each submission goes back to staff to verify.
 */
export async function POST(request: Request) {
  const payload = await botPayload()
  const student = await studentFromRequest(payload, request)
  if (!student) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_request', message: 'Please send the form again.' }, { status: 400 })
  }

  try {
    if (passportStatus(student) === 'verified') {
      return NextResponse.json({ ok: false, reason: 'verified', message: 'Your passport is already verified. To change it, please contact our team.' }, { status: 409 })
    }
    if (!(await passportAllowed(payload, student))) {
      return NextResponse.json({ ok: false, reason: 'not_yet', message: 'You can add your passport once your booking is paid.' }, { status: 409 })
    }
    const number = parsePassportNumber(form.get('passportNumber'))
    if (!number) return NextResponse.json({ ok: false, reason: 'bad_number', message: 'Enter the passport number as printed (letters and digits).' }, { status: 400 })
    const expiry = parsePassportExpiry(form.get('passportValidUntil'))
    if (!expiry.ok) return NextResponse.json({ ok: false, reason: 'bad_date', message: expiry.message }, { status: 400 })

    const file = form.get('copy')
    let copy: { bytes: Uint8Array; type: string } | null = null
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_COPY_BYTES) {
        return NextResponse.json({ ok: false, reason: 'too_large', message: 'The file is too large. Please upload a photo or PDF under 4 MB.' }, { status: 400 })
      }
      const bytes = new Uint8Array(await file.arrayBuffer())
      const type = sniffCopyType(bytes)
      if (!type) return NextResponse.json({ ok: false, reason: 'bad_file', message: 'Please upload a photo (JPG, PNG, WebP, HEIC) or a PDF of your passport.' }, { status: 400 })
      copy = { bytes, type }
    } else if (!(await hasPassportCopy(payload, student.id))) {
      return NextResponse.json({ ok: false, reason: 'copy_required', message: 'Please add a photo or scan of your passport (the page with your photo).' }, { status: 400 })
    }

    if (copy) await savePassportCopy(payload, student.id, copy.bytes, copy.type)
    await payload.update({
      collection: 'v1-students',
      id: student.id,
      overrideAccess: true,
      data: {
        passportNumber: number,
        passportValidUntil: expiry.date,
        passportStatus: 'submitted',
        passportRejectReason: '',
        ...(copy ? { passportCopyUploadedAt: new Date().toISOString() } : {}),
      } as any,
    })
    return NextResponse.json({ ok: true, message: 'Thank you! Our team will check your passport and then prepare your agreement.' })
  } catch (error) {
    console.error('Student passport API error:', error)
    return NextResponse.json({ ok: false, reason: 'error', message: 'Sorry, something went wrong. Please try again.' }, { status: 500 })
  }
}
