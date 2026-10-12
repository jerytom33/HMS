import Link from 'next/link';
import { BedSingle, CheckCircle2, MapPin, ShieldCheck, Users } from 'lucide-react';
import { notFound } from 'next/navigation';

import { Navbar } from '@/components/marketing/Navbar';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { RentIncludedNote } from '@/components/ui/RentIncludedNote';
import { GENDER_POLICY_LABELS, SHARING_LABELS } from '@/lib/botRooms';
import { botPayload, loadInventory } from '@/lib/botServer';
import { formatPLN } from '@/lib/currency';

import { Facilities, unitFacilities } from '../../Facilities';

export const dynamic = 'force-dynamic';

export default async function SharedBedPage({ params }: { params: Promise<{ unit: string; bed: string }> }) {
  const { unit: unitKey, bed: bedParam } = await params;
  const bedIndex = Number(bedParam);
  if (!Number.isInteger(bedIndex) || bedIndex < 0) notFound();

  const payload = await botPayload();
  const { units, properties, overrides } = await loadInventory(payload, { includeMaintenance: true });
  const unit = units.find((candidate) => candidate.overrideKey === unitKey && candidate.allBedList.some((bed) => bed.index === bedIndex));
  if (!unit) notFound();

  const bed = unit.allBedList.find((candidate) => candidate.index === bedIndex)!;
  const photos = [...new Set([...bed.images, ...unit.images])];
  const roomPath = `/student/rooms?unit=${encodeURIComponent(unit.unit)}&bed=${bed.index}`;
  const loginHref = `/student/login?callbackUrl=${encodeURIComponent(roomPath)}`;
  const sharing = SHARING_LABELS[unit.sharing] || `${unit.sharing} share`;
  const available = unit.status !== 'maintenance' && bed.available;

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
                <PhotoCarousel images={photos} name={`${unit.label} ${bed.label}`} />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                  <span className="flex flex-col items-center gap-2 text-sm"><BedSingle className="h-10 w-10" /> Photos coming soon</span>
                </div>
              )}
            </div>
            {bed.description && (
              <div className="border-t border-border p-5 sm:p-6">
                <h2 className="font-display text-xl">About this bed</h2>
                <p className="mt-2 max-w-[70ch] text-sm leading-6 text-muted-foreground">{bed.description}</p>
              </div>
            )}
            <Facilities {...unitFacilities(unit, properties, overrides)} />
          </section>

          <aside className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${available ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                <span className={`h-2 w-2 rounded-full ${available ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {unit.status === 'maintenance' ? 'Temporarily unavailable' : available ? 'Available now' : 'Currently unavailable'}
              </span>
              <span className="text-sm font-medium text-muted-foreground">{bed.type}</span>
            </div>

            <h1 className="mt-5 font-display text-3xl sm:text-4xl">{bed.label}</h1>
            <p className="mt-1 text-lg font-medium">{unit.label}</p>
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
                <dt className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" /> Sharing</dt>
                <dd className="mt-1 font-semibold">{sharing}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Who may stay</dt>
                <dd className="mt-1 font-semibold">{GENDER_POLICY_LABELS[unit.genderPolicy]}</dd>
              </div>
            </dl>

            <RentIncludedNote variant="full" className="mt-5" />

            {unit.amenities.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold">Included amenities</h2>
                <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {unit.amenities.map((amenity) => (
                    <li key={amenity} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> {amenity}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {available ? (
              <Link href={loginHref} className="mt-7 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                Sign in to book this bed
              </Link>
            ) : (
              <Link href="/hostels" className="mt-7 flex min-h-12 w-full items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-secondary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                See available accommodation
              </Link>
            )}
            <Link href={`/beds/${encodeURIComponent(unit.overrideKey)}`} className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-secondary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              See all beds in this unit
            </Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">Availability is checked live before booking.</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
