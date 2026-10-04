// Pure tests for the WhatsApp bot room logic; no database needed. Run alone with:
//   npx jest src/tests/botRooms.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node"}'
import { describe, expect, it } from '@jest/globals'

import { formatPLN } from '../lib/currency'

import { listUnits, parseContactPhone, parseGender, parseSharing, parseUnitId, searchRooms, unitDetails, whatsappImageUrl, type BotOverride, type BotProperty } from '../lib/botRooms'

// Shapes taken from production documents on 2026-10-03
const B = '6ac0d4a2a2ce1743975c0c64' // Bukowiecka 11
const R = '6ac0f8a3b4be1797062cb41d' // Rajmunda 3
const W = '6ac0f90eb4be1797062cb41f' // Bernerowo

const properties: BotProperty[] = [
  { id: W, name: 'Bernerowo', location: 'Warsaw, Poland', rooms: 5, floors: 2, roomsPerFloor: [3, 2], isCustomBedsPerFloor: true, bedsPerFloor: [2, 1], floorNames: ['1st Floor', '2nd Floor'], beds: 2, images: [] },
  { id: R, name: 'Rajmunda 3', location: 'Warsaw ,Poland', rooms: 8, floors: 4, roomsPerFloor: [2, 3, 3, 0], isCustomBedsPerFloor: false, bedsPerFloor: [2, 2, 2, 2], floorNames: ['Ground Floor', '', '', ''], beds: 2, images: [] },
  {
    id: B, name: 'Bukowiecka 11', location: 'Warsaw ,Poland', rooms: 8, floors: 4, roomsPerFloor: [2, 2, 2, 2], isCustomBedsPerFloor: false, bedsPerFloor: [2, 2, 2, 2],
    floorNames: ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor'], beds: 2,
    images: ['https://res.cloudinary.com/dqojq3cle/image/upload/f_auto,q_auto/v1791024532/hms/n0hayn9oqt8uyvgbjzzp.heic'],
  },
]

const free = (n: number) => Array(n).fill(false)
const overrides: BotOverride[] = [
  // Orphan: its hostel was deleted
  { overrideKey: '6ac0ca0717c2f98f2bd2e00d-101', unitType: 'apartment', subRooms: [{ name: 'Bedroom 1', beds: 2 }], status: 'available', beds: 2, freeBeds: 2, bedStatuses: free(2) },
  { overrideKey: `${B}-S1`, unitType: 'studio', standalone: true, status: 'available', beds: 2, freeBeds: 2, bedStatuses: free(2), roomName: 'Studio 2', roomPrice: '' },
  { overrideKey: `${B}-S2`, unitType: 'studio', standalone: true, status: 'available', beds: 2, freeBeds: 2, bedStatuses: free(2), roomName: 'Studio 3', roomPrice: '1250' },
  { overrideKey: `${B}-101`, roomName: 'FRONT studio 1', unitType: 'apartment', subRooms: [{ name: 'Bedroom 1', beds: 2 }, { name: 'Bedroom 2', beds: 2 }], status: 'available', beds: 4, freeBeds: 4, bedStatuses: free(4), roomPrice: '1100' },
  { overrideKey: `${B}-202`, unitType: 'room', status: 'available', beds: 4, freeBeds: 4, bedStatuses: free(4), roomPrice: '870' },
  { overrideKey: `${B}-302`, unitType: 'room', status: 'available', beds: 4, freeBeds: 4, bedStatuses: free(4) },
  { overrideKey: `${B}-402`, unitType: 'room', status: 'available', beds: 4, freeBeds: 4, bedStatuses: free(4) },
  { overrideKey: `${B}-102`, unitType: 'apartment', subRooms: [{ name: 'Bedroom 1', beds: 2 }, { name: 'Bedroom 2', beds: 2 }], status: 'available', beds: 4, freeBeds: 4, bedStatuses: free(4) },
  { overrideKey: `${W}-101`, unitType: 'room', status: 'available', beds: 1, freeBeds: 1, bedStatuses: free(1) },
  { overrideKey: `${W}-102`, unitType: 'room', status: 'available', beds: 3, freeBeds: 3, bedStatuses: free(3) },
  { overrideKey: `${W}-103`, unitType: 'room', status: 'available', beds: 1, freeBeds: 1, bedStatuses: free(1) },
]

const units = listUnits(properties, overrides)
const count = (n: number) => searchRooms(units, n).total
// The result is a union over available / taken; tests read fields of the case they expect
const details = (...args: Parameters<typeof unitDetails>) => unitDetails(...args) as Record<string, any>

describe('bot room availability', () => {
  it('matches the production inventory per sharing type', () => {
    expect(count(1)).toBe(4) // Bernerowo 101, 103, 201, 202
    expect(count(2)).toBe(17) // 8 Rajmunda + Bukowiecka 201/301/401 + 2 studios + 4 apartment bedrooms
    expect(count(3)).toBe(1) // Bernerowo 102
    expect(count(4)).toBe(3) // Bukowiecka 202/302/402
  })

  it('skips rooms of deleted hostels', () => {
    expect(units.some((u) => u.overrideKey.startsWith('6ac0ca07'))).toBe(false)
  })

  it('asks for a hostel when more than 10 rooms match', () => {
    const two = searchRooms(units, 2)
    expect(two.status).toBe('choose_hostel')
    expect(two.rooms).toHaveLength(0)
    expect(two.hostels.map((h) => h.title)).toEqual(['Bukowiecka 11', 'Rajmunda 3'])
    const buk = searchRooms(units, 2, B)
    expect(buk.status).toBe('rooms')
    expect(buk.count).toBe(9)
    expect(buk.rooms.every((r) => r.title.length <= 24 && r.description.length <= 72)).toBe(true)
  })

  it('books apartments per bedroom', () => {
    const bedrooms = units.filter((u) => u.overrideKey === `${B}-101`)
    expect(bedrooms.map((u) => [u.unit, u.sharing, u.freeBedIndices])).toEqual([
      [`${B}-101~0`, 2, [0, 1]],
      [`${B}-101~1`, 2, [2, 3]],
    ])
    expect(parseUnitId(`${B}-101~1`)).toEqual({ overrideKey: `${B}-101`, subRoomIndex: 1 })
  })

  it('treats a bedroom with taken beds correctly', () => {
    const taken = overrides.map((o) => (o.overrideKey === `${B}-102` ? { ...o, bedStatuses: [true, true, true, false] } : o))
    const u = listUnits(properties, taken).filter((x) => x.overrideKey === `${B}-102`)
    expect(u.map((x) => x.freeBedIndices)).toEqual([[], [3]])
  })

  it('offers other sharing types or reports full', () => {
    const allTaken = units.map((u) => (u.sharing === 3 ? { ...u, freeBeds: 0, freeBedIndices: [] } : u))
    const three = searchRooms(allTaken, 3)
    expect(three.status).toBe('choose_other_sharing')
    expect(three.otherSharing.map((o) => o.title)).toEqual(['Single share', 'Two share', 'Four share'])
    const none = searchRooms(units.map((u) => ({ ...u, freeBeds: 0, freeBedIndices: [] })), 2)
    expect(none.status).toBe('not_available')
  })

  it('uses the hostel photo as a JPEG when the room has none', () => {
    const four = searchRooms(units, 4)
    expect(four.gallery).toHaveLength(3)
    expect(four.gallery[0].image).toBe('https://res.cloudinary.com/dqojq3cle/image/upload/f_jpg,q_auto,w_1280,c_limit/v1791024532/hms/n0hayn9oqt8uyvgbjzzp.heic')
    expect(whatsappImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png')
  })

  it('describes one room for the booking summary', () => {
    const room = details(units, `${B}-202`)
    expect(room.available).toBe(true)
    expect(room.summary).toBe('Room 202 — Bukowiecka 11, 1st Floor\n💰 870 PLN/month · 🔒 Deposit on request')
    const full = units.map((u) => (u.unit === `${B}-202` ? { ...u, freeBeds: 0, freeBedIndices: [] } : u))
    expect(details(full, `${B}-202`).available).toBe(false)
    expect(details(units, 'nope').available).toBe(false)
  })

  it('lists the free beds of a room and checks the chosen bed', () => {
    const taken = overrides.map((o) => (o.overrideKey === `${B}-202` ? { ...o, bedStatuses: [true, false, false, false] } : o))
    const u = listUnits(properties, taken)
    const room = details(u, `${B}-202`)
    expect(room.available).toBe(true)
    expect(room.beds.map((b: { value: string; title: string }) => [b.value, b.title])).toEqual([['1', 'Bed B'], ['2', 'Bed C'], ['3', 'Bed D']])
    expect(room.bedsText).toBe('3 of 4 beds free')
    const bedC = details(u, `${B}-202`, '2')
    expect(bedC.available).toBe(true)
    expect(bedC.summary).toBe('Room 202, Bed C — Bukowiecka 11, 1st Floor\n💰 870 PLN/month · 🔒 Deposit on request')
    const bedA = details(u, `${B}-202`, 0)
    expect(bedA.available).toBe(false)
    expect(bedA.reason).toBe('bed_taken')
  })

  it('names the type of each free bed, bunk position included', () => {
    const typed = overrides.map((o) =>
      o.overrideKey === `${B}-202` ? { ...o, bedTypes: ['bunk', 'bunk', 'independent', 'independent'], bunkPositions: ['lower', 'upper', null, null] } : o,
    )
    const room = details(listUnits(properties, typed), `${B}-202`)
    expect(room.beds.map((b: { bedType: string }) => b.bedType)).toEqual(['Bunk Bed · Lower', 'Bunk Bed · Upper', 'Independent Bed', 'Independent Bed'])
    expect(room.beds[1].description).toBe('Bunk Bed · Upper · 870 PLN/month · Deposit on request')
    expect(room.beds.every((b: { description: string }) => b.description.length <= 72)).toBe(true)
    expect(details(listUnits(properties, typed), `${B}-202`, '1').bedType).toBe('Bunk Bed · Upper')
  })

  it('shows the deposit and the free beds\' photos', () => {
    const photo = 'https://res.cloudinary.com/dqojq3cle/image/upload/f_auto,q_auto/v1/hms/bed-c.jpg'
    const edited = overrides.map((o) =>
      o.overrideKey === `${B}-202` ? { ...o, deposit: '1000', bedStatuses: [false, true, false, false], bedImages: [[], [], [photo], []] } : o,
    )
    const room = details(listUnits(properties, edited), `${B}-202`)
    const dep = `Deposit ${formatPLN(1000)}`
    expect(room.deposit).toBe(dep)
    expect(room.beds[0].description).toBe(`Independent Bed · 870 PLN/month · ${dep}`)
    expect(room.hasBedPhotos).toBe(true)
    expect(room.bedGallery).toEqual([
      { image: 'https://res.cloudinary.com/dqojq3cle/image/upload/f_jpg,q_auto,w_1280,c_limit/v1/hms/bed-c.jpg', caption: `🛏 Bed C (Independent Bed) — Room 202, Bukowiecka 11\n💰 870 PLN/month · 🔒 ${dep}` },
    ])
    expect(details(units, `${B}-202`).hasBedPhotos).toBe(false)
  })

  it('labels apartment beds within their bedroom', () => {
    const second = details(units, `${B}-101~1`)
    expect(second.beds.map((b: { value: string; title: string }) => [b.value, b.title])).toEqual([['2', 'Bed A'], ['3', 'Bed B']])
  })

  it('reads a typed phone number', () => {
    expect(parseContactPhone('+48 500 100 200')).toBe('48500100200')
    expect(parseContactPhone('0048-500-100-200')).toBe('48500100200')
    expect(parseContactPhone('12345')).toBeNull()
    expect(parseContactPhone('call me')).toBeNull()
  })

  it('reads the gender answer', () => {
    expect(parseGender('Male')).toBe('male')
    expect(parseGender(' female ')).toBe('female')
    expect(parseGender('Other')).toBe('other')
    expect(parseGender('maybe')).toBeNull()
  })

  it('reads the sharing answer from the list', () => {
    expect(parseSharing('Single share')).toBe(1)
    expect(parseSharing('Two share')).toBe(2)
    expect(parseSharing('Three share')).toBe(3)
    expect(parseSharing('4')).toBe(4)
    expect(parseSharing('hello')).toBeNull()
  })
})
