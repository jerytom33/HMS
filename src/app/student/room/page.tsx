'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BedSingle, CheckCircle2, Info, MapPin, Search } from 'lucide-react';
import { formatPLN } from '@/lib/currency';
import { studentGet, type StudentRoom } from '@/lib/studentClient';

export default function StudentRoomPage() {
  const [room, setRoom] = useState<StudentRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    studentGet<{ room: StudentRoom | null }>('/api/student/room', '/student/room')
      .then((r) => setRoom(r.room))
      .catch((e) => { if (e?.message !== 'signed out') setError("Couldn't load your room. Please refresh the page."); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  if (!room) {
    return (
      <div className="max-w-4xl space-y-6">
        <h1 className="font-display text-3xl font-medium">My Room</h1>
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <h2 className="font-display text-xl">No room assigned yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Your room appears here once our staff assign your bed. If you have booked a bed, it is listed under Bookings until then.
          </p>
          <Link href="/student/rooms" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
            <Search className="h-4 w-4" /> Find a Room
          </Link>
        </div>
      </div>
    );
  }

  const photos = [...new Set([room.bedImage, ...room.images].filter((x): x is string => !!x))];
  const details = [
    { label: 'Type', value: room.unitType },
    { label: 'Floor', value: room.floorName },
    { label: 'Your bed', value: room.bed },
    { label: 'Bed type', value: room.bedType },
    { label: 'Sharing', value: `${room.sharing} ${room.sharing === 1 ? 'bed' : 'beds'}` },
    { label: 'Who may stay', value: room.genderPolicy },
    { label: 'Rent', value: room.rent !== null ? `${formatPLN(room.rent)}/month` : 'On request' },
    { label: 'Deposit', value: room.deposit !== null ? formatPLN(room.deposit) : 'On request' },
  ];

  return (
    <div className="max-w-4xl space-y-8 pb-10">
      <div>
        <h1 className="font-display text-3xl font-medium mb-1">My Room</h1>
        <p className="text-muted-foreground text-sm">The room and bed assigned to you.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {photos[0] && <img src={photos[0]} alt={room.label} className="w-full h-56 sm:h-72 object-cover" />}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div>
              <h2 className="font-display text-2xl">{room.label} · {room.bed}</h2>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {[room.hostel, room.location].filter(Boolean).join(', ')}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
              <BedSingle className="h-4 w-4" /> {room.bedType}
            </span>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border pt-6">
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-xs text-muted-foreground mb-1">{d.label}</dt>
                <dd className="font-medium text-sm">{d.value}</dd>
              </div>
            ))}
          </dl>

          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" /> {room.rentIncludes}.
          </p>

          {room.amenities.length > 0 && (
            <div>
              <h3 className="text-sm uppercase tracking-wider font-semibold text-muted-foreground mb-3">Amenities</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {room.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" /> {a}</li>
                ))}
              </ul>
            </div>
          )}

          {room.facilities.length > 0 && (
            <div>
              <h3 className="text-sm uppercase tracking-wider font-semibold text-muted-foreground mb-3">Nearby & at the property</h3>
              <div className="flex flex-wrap gap-2">
                {room.facilities.map((f) => <span key={f} className="text-xs border border-border rounded-full px-3 py-1">{f}</span>)}
              </div>
            </div>
          )}

          {photos.length > 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.slice(1).map((src) => <img key={src} src={src} alt="" className="w-full h-32 object-cover rounded-lg" />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
