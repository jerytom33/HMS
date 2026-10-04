import { NextResponse } from 'next/server'

import { allowedForGender, depositText, GENDER_LABELS, GENDER_POLICY_LABELS, parseSharing, SHARING_LABELS } from '@/lib/botRooms'
import { formatPLN } from '@/lib/currency'
import { botPayload, loadInventory } from '@/lib/botServer'
import { studentFromRequest, studentGender } from '@/lib/studentAuth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/student/rooms[?sharing=2]
 * Free rooms, studios and apartment bedrooms the signed-in student may book: mixed units,
 * plus male-only / female-only units matching the gender on their record.
 */
export async function GET(request: Request) {
  const payload = await botPayload()
  const student = await studentFromRequest(payload, request)
  if (!student) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })

  const gender = studentGender(student)
  const sharing = parseSharing(new URL(request.url).searchParams.get('sharing'))
  const { units } = await loadInventory(payload)
  const visible = units.filter((u) => u.freeBeds > 0 && allowedForGender(u.genderPolicy, gender))
  const shown = sharing ? visible.filter((u) => u.sharing === sharing) : visible

  return NextResponse.json({
    ok: true,
    gender: gender ? GENDER_LABELS[gender] : '',
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
