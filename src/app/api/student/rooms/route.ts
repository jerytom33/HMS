import { NextResponse } from 'next/server'

import { allowedForGender, depositText, GENDER_LABELS, GENDER_POLICY_LABELS, parseSharing, SHARING_LABELS } from '@/lib/botRooms'
import { formatPLN } from '@/lib/currency'
import { botPayload, loadInventory } from '@/lib/botServer'
import { arrivalRange, browsingStudent, dmyToIso, parseArrivalDate, studentGender } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/student/rooms[?sharing=2]
 * Free rooms, studios and apartment bedrooms the signed-in student may book: mixed units,
 * plus male-only / female-only units matching the gender on their record.
 * Works with a browse session from the bot's personal link too (`verified` false: holding a
 * bed then needs a WhatsApp code). Returns only what the booking form needs about the student.
 */
export async function GET(request: Request) {
  const payload = await botPayload()
  const who = await browsingStudent(payload, request)
  if (!who) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })
  const { student } = who

  const gender = studentGender(student)
  const sharing = parseSharing(new URL(request.url).searchParams.get('sharing'))
  const { units } = await loadInventory(payload)
  const visible = units.filter((u) => u.freeBeds > 0 && allowedForGender(u.genderPolicy, gender))
  const shown = sharing ? visible.filter((u) => u.sharing === sharing) : visible

  return NextResponse.json({
    ok: true,
    verified: who.verified,
    name: student.name || '',
    whatsapp: student.whatsapp,
    gender: gender ? GENDER_LABELS[gender] : '',
    // Saved arrival as YYYY-MM-DD for the date picker, only while it is still allowed
    arrivalDate: parseArrivalDate(student.arrivalDate).ok ? dmyToIso(student.arrivalDate) : '',
    arrivalRange: arrivalRange(),
    // Without a known gender only mixed units are shown
    genderKnown: gender === 'male' || gender === 'female',
    sharingOptions: [...new Set(visible.map((u) => u.sharing))].sort((a, b) => a - b).map((n) => ({ value: n, label: SHARING_LABELS[n] || `${n} share` })),
    rooms: shown
      .sort((a, b) => a.hostel.localeCompare(b.hostel) || (a.floor ?? 999) - (b.floor ?? 999) || a.label.localeCompare(b.label, undefined, { numeric: true }))
      .map((u) => ({
        unit: u.unit,
        label: u.label,
        hostel: u.hostel,
        location: u.location,
        floor: u.floorName,
        unitType: u.unitType,
        sharing: u.sharing,
        sharingLabel: SHARING_LABELS[u.sharing] || `${u.sharing} share`,
        freeBeds: u.freeBeds,
        price: u.price !== null ? `${formatPLN(u.price)}/month` : 'Price on request',
        deposit: depositText(u.deposit),
        amenities: u.amenities,
        image: u.images[0] || null,
        genderPolicy: GENDER_POLICY_LABELS[u.genderPolicy],
        beds: u.freeBedList.map((b) => ({ index: b.index, label: b.label, type: b.type, image: b.image })),
      })),
  })
}
