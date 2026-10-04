'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { BOOKING_STATUS, studentGet, type StudentBooking } from '@/lib/studentClient';

const STATUS_STYLE: Record<string, string> = {
  held: 'bg-primary/10 text-primary',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-secondary/10 text-muted-foreground',
};

export default function StudentBookings() {
  const [bookings, setBookings] = useState<StudentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    studentGet<{ bookings: StudentBooking[] }>('/api/student/bookings', '/student/bookings')
      .then((b) => setBookings(b.bookings))
      .catch((e) => { if (e?.message !== 'signed out') setError("Couldn't load your bookings. Please refresh the page."); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl space-y-8 pb-10">
      <div>
        <h1 className="font-display text-3xl font-medium mb-1">Bookings</h1>
        <p className="text-muted-foreground text-sm">Beds you booked here or on WhatsApp. A held bed is kept for you until payment.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : bookings.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <p className="text-sm text-muted-foreground mb-4">You have no bookings yet.</p>
          <Link href="/student/rooms" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
            <Search className="h-4 w-4" /> Find a Room
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.ref} className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
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
              {b.createdAt && <p className="text-xs text-muted-foreground mt-3">Booked {new Date(b.createdAt).toLocaleDateString('en-GB')}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
