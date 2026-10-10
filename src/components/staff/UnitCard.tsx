'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { BedDouble, ChevronRight, MessageCircle, X } from 'lucide-react';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { StudentAvatar } from '@/components/StudentAvatar';
import { BedTypeIcon } from '@/components/ui/BedTypeIcon';
import { RentIncludedNote } from '@/components/ui/RentIncludedNote';
import { bedTypeCounts } from '@/lib/propertyTypes';

/** A student in a unit: assigned by staff, or with a booking paid / on hold. */
export type UnitOccupant = { bedIndex: number; bed: string; name: string; photo: string | null; state: string; id?: string; whatsapp?: string };

const STATE_STYLE: Record<string, string> = {
  'On hold': 'bg-amber-100 text-amber-800',
  Paid: 'bg-green-100 text-green-800',
  Assigned: 'bg-green-100 text-green-800',
};

/** Photo in a gradient ring, as on the unit card. */
function RingAvatar({ person, size }: { person: UnitOccupant; size: number }) {
  return (
    <span className="inline-block rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2.5px]" title={`${person.name} · ${person.bed} · ${person.state}`}>
      <StudentAvatar name={person.name} src={person.photo} size={size} className="ring-2 ring-white dark:ring-gray-900" title={`${person.name} · ${person.bed} · ${person.state}`} />
    </span>
  );
}

/** "Emma, Sam, Aisha & 2 others" */
const firstNames = (people: UnitOccupant[]) => {
  const names = people.slice(0, 3).map((p) => p.name.trim().split(/\s+/)[0]);
  const rest = people.length - names.length;
  return rest > 0 ? `${names.join(', ')} & ${rest} ${rest === 1 ? 'other' : 'others'}` : names.join(', ');
};

/**
 * A unit (room, studio or apartment) in the staff unit map: its photos on top, name and status,
 * bills and beds, then the students in it and a link to their profiles.
 */
export function UnitCard({ title, typeLabel, status, beds, freeBeds, filledBeds, bedTypes, photos, people, onOpen, onViewProfiles }: {
  title: string; typeLabel: string; status: string; beds: number; freeBeds?: number; filledBeds?: number; bedTypes?: string[];
  photos: string[]; people: UnitOccupant[]; onOpen: () => void; onViewProfiles: () => void;
}) {
  const counts = bedTypeCounts(bedTypes, beds);
  const tone = status === 'maintenance' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
    : status === 'occupied' ? 'bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800'
    : 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900';
  return (
    <div
      role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(); }}
      className={`group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${tone}`}
    >
      {/* The room's photos */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800">
        {photos.length > 0 ? (
          <PhotoCarousel images={photos} name={title} autoMs={3500} />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-gray-400">
            <span className="flex flex-col items-center gap-1 text-xs"><BedDouble className="h-8 w-8" /> No room photos yet</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-lg font-bold leading-tight text-gray-900 group-hover:text-blue-700 dark:text-gray-100" data-no-translate>{title}</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{typeLabel}</div>
          </div>
          <span className={`shrink-0 text-sm font-semibold ${status === 'maintenance' ? 'text-red-600' : status === 'occupied' ? 'text-gray-500' : 'text-green-600'}`}>
            {status === 'maintenance' ? 'Maintenance' : status === 'occupied' ? 'Full' : 'Free'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 text-sm text-gray-700 dark:text-gray-300">
          <RentIncludedNote variant="icons" />
          <span>{`${beds} Total Bed${beds !== 1 ? 's' : ''}`}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="inline-flex items-center gap-3 text-gray-700 dark:text-gray-300">
            {counts.independent > 0 && <span className="inline-flex items-center gap-1" title="Independent Bed"><BedTypeIcon type="independent" className="h-4 w-4" />{counts.independent}</span>}
            {counts.bunk > 0 && <span className="inline-flex items-center gap-1" title="Bunk Bed"><BedTypeIcon type="bunk" className="h-4 w-4" />{counts.bunk}</span>}
          </span>
          <span className="inline-flex items-center gap-3 font-semibold">
            <span className="inline-flex items-center gap-1 text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />{`${freeBeds ?? '-'} Free`}</span>
            <span className="inline-flex items-center gap-1 text-red-500"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />{`${filledBeds ?? '-'} Filled`}</span>
          </span>
        </div>

        <div className="mt-auto pt-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Students</div>
          {people.length > 0 ? (
            <div className="mt-1.5 flex items-center gap-2.5">
              <span className="flex shrink-0 -space-x-2.5">
                {people.slice(0, 3).map((p) => <RingAvatar key={p.bedIndex} person={p} size={36} />)}
              </span>
              <span className="min-w-0 text-sm leading-snug text-gray-800 line-clamp-2 dark:text-gray-200" data-no-translate title={people.map((p) => p.name).join(', ')}>{firstNames(people)}</span>
            </div>
          ) : (
            <div className="mt-1.5 text-sm text-gray-400">No students yet</div>
          )}
        </div>
      </div>

      {people.length > 0 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onViewProfiles(); }}
          className="flex w-full items-center justify-center gap-1 border-t border-black/5 py-2.5 text-sm font-medium text-gray-600 hover:bg-black/5 hover:text-gray-900 focus:outline-none focus-visible:bg-black/5 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">
          View Profiles <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** The students of one unit, each with their bed, state, WhatsApp and a link to their page. */
export function UnitProfiles({ title, people, onClose }: { title: string; people: UnitOccupant[]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="unit-profiles-title" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h2 id="unit-profiles-title" className="font-semibold text-gray-900 dark:text-gray-100">
            Students · <span data-no-translate>{title}</span>
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
        </div>
        <ul className="max-h-[70vh] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
          {people.map((p) => {
            const wa = String(p.whatsapp || '').replace(/\D/g, '');
            return (
              <li key={p.bedIndex} className="flex items-center gap-3 px-5 py-3.5">
                <RingAvatar person={p} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-gray-900 dark:text-gray-100" data-no-translate>{p.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{p.bed}</span>
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${STATE_STYLE[p.state] || 'bg-gray-100 text-gray-700'}`}>{p.state}</span>
                    {wa && (
                      <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-700 hover:underline dark:text-green-400">
                        <MessageCircle className="h-3.5 w-3.5" /> +{wa}
                      </a>
                    )}
                  </div>
                </div>
                {p.id && (
                  <Link href={`/staff/students/${p.id}`} className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-gray-700 dark:text-blue-400 dark:hover:bg-blue-950/40">
                    Profile
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
