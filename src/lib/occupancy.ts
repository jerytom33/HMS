// Bed occupancy across properties, from the same units the bot and the portal list (floor
// rooms, units outside floors, apartment bedrooms; units under maintenance are left out).
// A bed is taken when it is marked in bedStatuses: assigned by staff, or held/paid through a
// booking. Bookings still on hold are counted separately so staff can tell them apart.
import { listUnits, type BotOverride, type BotProperty } from './botRooms'

export type Occupancy = { totalBeds: number; takenBeds: number; heldBeds: number }
export type PropertyOccupancy = Occupancy & { id: string; name: string; floors: (Occupancy & { floor: number | null; name: string })[] }

const empty = (): Occupancy => ({ totalBeds: 0, takenBeds: 0, heldBeds: 0 })

export const occupancyPercent = (o: Occupancy) => (o.totalBeds > 0 ? Math.round((o.takenBeds / o.totalBeds) * 100) : 0)

/**
 * Occupancy per property and floor, plus the total. `heldBookings` are bed holds on hold
 * (status 'held') with their overrideKey and bedIndex.
 */
export function occupancy(properties: BotProperty[], overrides: BotOverride[], heldBookings: { overrideKey?: string; bedIndex?: number }[] = []) {
  const held = new Set(heldBookings.filter((b) => b.overrideKey && typeof b.bedIndex === 'number').map((b) => `${b.overrideKey}:${b.bedIndex}`))
  const units = listUnits(properties, overrides)
  const byProperty: PropertyOccupancy[] = properties.map((p) => ({ id: String(p.id), name: p.name || 'Property', ...empty(), floors: [] }))
  const total = empty()

  for (const u of units) {
    const prop = byProperty.find((p) => p.id === u.propertyId)
    if (!prop) continue
    const free = new Set(u.freeBedIndices)
    // Flat bed indices of this unit (an apartment bedroom covers a slice of the apartment's beds)
    const o = overrides.find((x) => x.overrideKey === u.overrideKey)
    let start = 0
    if (u.subRoomIndex !== null && o?.subRooms) for (let i = 0; i < u.subRoomIndex; i++) start += Number(o.subRooms[i]?.beds) || 0
    const indices = Array.from({ length: u.sharing }, (_, i) => start + i)
    const taken = indices.filter((i) => !free.has(i)).length
    const onHold = indices.filter((i) => !free.has(i) && held.has(`${u.overrideKey}:${i}`)).length

    let floor = prop.floors.find((f) => f.floor === u.floor)
    if (!floor) {
      floor = { floor: u.floor, name: u.floorName, ...empty() }
      prop.floors.push(floor)
    }
    for (const target of [floor, prop, total]) {
      target.totalBeds += u.sharing
      target.takenBeds += taken
      target.heldBeds += onHold
    }
  }
  for (const p of byProperty) p.floors.sort((a, b) => (a.floor ?? 999) - (b.floor ?? 999))
  return { total, properties: byProperty }
}
