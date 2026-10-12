import Link from 'next/link';
import { BedSingle, CheckCircle2, MapPin, ShieldCheck, Users } from 'lucide-react';
import { notFound } from 'next/navigation';

import { Navbar } from '@/components/marketing/Navbar';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { RentIncludedNote } from '@/components/ui/RentIncludedNote';
import { GENDER_POLICY_LABELS } from '@/lib/botRooms';
import { botPayload, loadInventory } from '@/lib/botServer';
import { formatPLN } from '@/lib/currency';

import { Facilities, unitFacilities } from '../Facilities';

export const dynamic = 'force-dynamic';

/** Public page for one shared room, studio or apartment: every bed with its live availability. */
export default async function SharedUnitPage({ params }: { params: Promise<{ unit: string }> }) {
  const { unit: unitParam } = await params;
  const unitKey = decodeURIComponent(unitParam);

  const payload = await botPayload();
  const { units, properties, overrides } = await loadInventory(payload, { includeMaintenance: true });
  // An apartment is one entry per bedroom, all under the same key
  const parts = units.filter((candidate) => candidate.overrideKey === unitKey);
  if (!parts.length) notFound();

  const unit = parts[0];
  const title = unit.subRoomName ? unit.label.slice(0, unit.label.lastIndexOf(' · ')) : unit.label;
  const beds = parts.flatMap((part) => part.allBedList);
  const maintenance = unit.status === 'maintenance';
  const free = maintenance ? 0 : beds.filter((bed) => bed.available).length;
  const photos = [...new Set(parts.flatMap((part) => part.images))];
  const amenities = [...new Set(parts.flatMap((part) => part.amenities))];
  const bedHref = (index: number) => `/beds/${encodeURIComponent(unitKey)}/${index}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link href="/hostels" className="mb-6 inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
          View all accommodation
        </Link>

        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)] lg:items-start">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative aspect-[4/3] w-full bg-secondary/10 sm:aspect-[16/10]">
              {photos.length ? (
                <PhotoCarousel images={photos} name={title} />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                  <span className="flex flex-col items-center gap-2 text-sm"><BedSingle className="h-10 w-10" /> Photos coming soon</span>
                </div>
              )}
            </div>

            <div className="border-t border-border p-5 sm:p-6">
              <h2 className="font-display text-xl">Beds</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {beds.map((bed) => {
                  const available = !maintenance && bed.available;
                  return (
                    <li key={bed.index} className="min-w-0">
                      <Link href={bedHref(bed.index)} className="flex h-full flex-col overflow-hidden rounded-xl border border-border transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <div className="relative aspect-[16/9] w-full bg-secondary/10">
                          {bed.images[0] ? (
                            <img src={bed.images[0]} alt={bed.label} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 grid place-items-center text-muted-foreground"><BedSingle className="h-8 w-8" /></div>
                          )}
                          <span className={`absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm ${available ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                            {available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col gap-1 p-3.5">
                          <span className="font-semibold">{bed.label}</span>
                          <span className="text-xs text-muted-foreground">{bed.type}</span>
                          {bed.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{bed.description}</p>}
                          <span className="mt-auto pt-2 text-sm font-medium text-primary">View bed details</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Facilities {...unitFacilities(unit, properties, overrides)} />
          </section>

          <aside className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${free ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
              <span className={`h-2 w-2 rounded-full ${free ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              {maintenance ? 'Temporarily unavailable' : `${free} of ${beds.length} bed${beds.length !== 1 ? 's' : ''} available`}
            </span>

            <h1 className="mt-5 font-display text-3xl sm:text-4xl">{title}</h1>
            <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {[unit.hostel, unit.location, unit.floorName].filter(Boolean).join(' · ')}
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-5 text-sm">
              <div>
                <dt className="text-muted-foreground">Monthly rent</dt>
                <dd className="mt-1 font-semibold">{unit.price !== null ? formatPLN(unit.price) : 'On request'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Deposit</dt>
                <dd className="mt-1 font-semibold">{unit.deposit !== null ? formatPLN(unit.deposit) : 'On request'}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" /> Beds</dt>
                <dd className="mt-1 font-semibold">{beds.length}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Who may stay</dt>
                <dd className="mt-1 font-semibold">{GENDER_POLICY_LABELS[unit.genderPolicy]}</dd>
              </div>
            </dl>

            <RentIncludedNote variant="full" className="mt-5" />

            {amenities.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold">Included amenities</h2>
                <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {amenities.map((amenity) => (
                    <li key={amenity} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> {amenity}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-6 text-center text-xs text-muted-foreground">Choose a bed to see its details and book. Availability is checked live before booking.</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
