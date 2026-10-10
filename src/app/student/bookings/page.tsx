'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { BOOKING_STATUS, cancelBooking, studentGet, type StudentBooking } from '@/lib/studentClient';

const STATUS_STYLE: Record<string, string> = {
  held: 'bg-primary/10 text-primary',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-secondary/10 text-muted-foreground',
};

export default function StudentBookings() {
  const [bookings, setBookings] = useState<StudentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Ref awaiting "Yes, cancel", the one being cancelled, and the last result
  const [confirming, setConfirming] = useState('');
  const [cancelling, setCancelling] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = () =>
    studentGet<{ bookings: StudentBooking[] }>('/api/student/bookings', '/student/bookings')
      .then((b) => setBookings(b.bookings))
      .catch((e) => { if (e?.message !== 'signed out') setError("Couldn't load your bookings. Please refresh the page."); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const cancel = async (ref: string) => {
    setCancelling(ref);
    setResult(await cancelBooking(ref));
    setCancelling('');
    setConfirming('');
    load();
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 pb-10">
      <div>
        <h1 className="font-display text-3xl font-medium mb-1">Bookings</h1>
        <p className="text-muted-foreground text-sm">Beds you booked here or on WhatsApp. A held bed is kept for you until payment. You can have one booking at a time; to book a different bed, cancel your booking first.</p>
      </div>

      {result && (
        <div role="status" className={`rounded-lg border p-4 text-sm ${result.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200'}`}>
          {result.message}
          {result.ok && <> <Link href="/student/rooms" className="font-medium underline">Find a room</Link></>}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : bookings.length === 0 ? (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-8">
          <p className="text-sm text-muted-foreground mb-4">You have no bookings yet.</p>
          <Link href="/student/rooms" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
            <Search className="h-4 w-4" /> Find a Room
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.ref} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <h2 className="font-display text-lg">{b.room}, {b.bed}</h2>
                  <p className="text-sm text-muted-foreground">{[b.hostel, b.floor].filter(Boolean).join(' · ')}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[b.status] || 'bg-secondary/10'}`}>
                  {BOOKING_STATUS[b.status] || b.status}
                </span>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border pt-4 mt-4 text-sm">
                <div><dt className="text-xs text-muted-foreground">Reference</dt><dd className="font-medium">{b.ref}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Arrival</dt><dd className="font-medium">{b.arrivalDate || '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Rent</dt><dd className="font-medium">{b.price}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Deposit</dt><dd className="font-medium">{b.deposit.replace(/^Deposit /, '')}</dd></div>
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                {b.createdAt && <p className="text-xs text-muted-foreground">Booked {new Date(b.createdAt).toLocaleDateString('en-GB')}</p>}
                {b.canCancel && (confirming === b.ref ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span>Cancel this booking and free the bed?</span>
                    <button onClick={() => cancel(b.ref)} disabled={cancelling === b.ref}
                      className="rounded-lg bg-destructive px-3 py-1.5 font-medium text-white disabled:opacity-50">
                      {cancelling === b.ref ? 'Cancelling…' : 'Yes, cancel'}
                    </button>
                    <button onClick={() => setConfirming('')} className="rounded-lg border border-border px-3 py-1.5">Keep it</button>
                  </div>
                ) : (
                  <button onClick={() => { setConfirming(b.ref); setResult(null); }} className="rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                    Cancel booking
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
