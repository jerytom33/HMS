'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bed, ChevronRight, Search, User } from 'lucide-react';
import { BOOKING_STATUS, studentGet, type StudentBooking, type StudentProfile, type StudentRoom } from '@/lib/studentClient';

export default function StudentDashboard() {
  const [me, setMe] = useState<StudentProfile | null>(null);
  const [room, setRoom] = useState<StudentRoom | null>(null);
  const [bookings, setBookings] = useState<StudentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      studentGet<StudentProfile>('/api/student/me', '/student'),
      studentGet<{ room: StudentRoom | null }>('/api/student/room', '/student'),
      studentGet<{ bookings: StudentBooking[] }>('/api/student/bookings', '/student'),
    ])
      .then(([m, r, b]) => { setMe(m); setRoom(r.room); setBookings(b.bookings); })
      .catch((e) => { if (e?.message !== 'signed out') setError("Couldn't load your details. Please refresh the page."); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  const active = bookings.filter((b) => b.status === 'held' || b.status === 'paid');
  const firstName = me?.name?.trim().split(/\s+/)[0];

  return (
    <div className="max-w-4xl space-y-8 pb-10">
      <div>
        <h1 className="font-display text-3xl font-medium mb-1">{firstName ? `Welcome back, ${firstName}` : 'Welcome'}</h1>
        <p className="text-muted-foreground text-sm">
          {room ? `Your stay at ${room.hostel}.` : 'Find a room and book your bed.'}
          {me?.arrivalDateText ? ` Planned arrival: ${me.arrivalDateText}.` : ''}
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        {room ? (
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-1 rounded">Your Room</span>
              <h2 className="font-display text-2xl mt-3">{room.hostel}</h2>
              <p className="text-sm text-muted-foreground mt-1">{[room.location, room.floorName].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">{room.unitType} / Bed</div>
              <div className="font-semibold text-lg">{room.label} · {room.bed}</div>
              <Link href="/student/room" className="inline-flex items-center gap-1 text-sm text-primary mt-2 hover:underline">
                Room details <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="font-display text-xl">No room assigned yet</h2>
              <p className="text-sm text-muted-foreground mt-1">Once your booking is confirmed, our staff will assign your bed here.</p>
            </div>
            <Link href="/student/rooms" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
              <Search className="h-4 w-4" /> Find a Room
            </Link>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-xl">Your Bookings</h2>
          <Link href="/student/bookings" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active bookings.</p>
        ) : (
          <div className="space-y-3">
            {active.map((b) => (
              <div key={b.ref} className="bg-card border border-border rounded-xl p-4 flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-medium">{b.room}, {b.bed} — {b.hostel}</div>
                  <div className="text-xs text-muted-foreground mt-1">Ref {b.ref}{b.arrivalDate ? ` · Arrival ${b.arrivalDate}` : ''}</div>
                </div>
                <span className="text-xs font-semibold self-center">{BOOKING_STATUS[b.status] || b.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/student/rooms', label: 'Find a Room', icon: Search },
          { href: '/student/room', label: 'My Room', icon: Bed },
          { href: '/student/profile', label: 'My Profile', icon: User },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary transition-colors">
            <Icon className="h-5 w-5 text-primary" /> <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
