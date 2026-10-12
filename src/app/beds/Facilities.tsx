import type { BotOverride, BotProperty, BotUnit } from '@/lib/botRooms';

type Facility = { description: string; images: string[] };

const asFacilities = (list: unknown): Facility[] =>
  Array.isArray(list)
    ? list
        .filter((f) => f && typeof f === 'object')
        .map((f) => ({ description: String(f.description || ''), images: Array.isArray(f.images) ? f.images.filter(Boolean) : [] }))
        .filter((f) => f.description || f.images.length)
    : [];

/** The room's own facilities and those of its floor, as staff entered them on the Properties page. */
export function unitFacilities(unit: BotUnit, properties: BotProperty[], overrides: BotOverride[]) {
  const property = properties.find((p) => String(p.id) === unit.propertyId) as (BotProperty & { floorFacilitiesLists?: unknown[] }) | undefined;
  const override = overrides.find((o) => o.overrideKey === unit.overrideKey);
  return {
    room: asFacilities(override?.roomFacilitiesList),
    floor: unit.floor ? asFacilities(property?.floorFacilitiesLists?.[unit.floor - 1]) : [],
    floorName: unit.floorName,
  };
}

function FacilityList({ title, facilities }: { title: string; facilities: Facility[] }) {
  if (!facilities.length) return null;
  return (
    <div className="border-t border-border p-5 sm:p-6">
      <h2 className="font-display text-xl">{title}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {facilities.map((facility, i) => (
          <li key={i} className="min-w-0 overflow-hidden rounded-xl border border-border">
            {facility.images.length > 0 && (
              <div className="flex gap-1 overflow-x-auto bg-secondary/10">
                {facility.images.map((src) => (
                  <img key={src} src={src} alt={facility.description || title} loading="lazy" className="h-36 w-full min-w-[60%] flex-1 object-cover" />
                ))}
              </div>
            )}
            {facility.description && <p className="whitespace-pre-line p-3 text-sm leading-6 text-muted-foreground">{facility.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Facilities({ room, floor, floorName }: ReturnType<typeof unitFacilities>) {
  return (
    <>
      <FacilityList title="Room facilities" facilities={room} />
      <FacilityList title={floorName ? `${floorName} facilities` : 'Floor facilities'} facilities={floor} />
    </>
  );
}
