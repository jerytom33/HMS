'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, BedSingle, CheckCircle2, Clock, FileText, Info, MapPin, Search } from 'lucide-react';
import { formatPLN } from '@/lib/currency';
import { AgreementViewer } from '@/components/AgreementViewer';
import { showDate } from '@/lib/rent';
import { studentGet, type PassportInfo, type PendingBooking, type StudentProfile, type StudentRoom } from '@/lib/studentClient';

export default function StudentRoomPage() {
  const [room, setRoom] = useState<StudentRoom | null>(null);
  const [pending, setPending] = useState<PendingBooking | null>(null);
  const [passport, setPassport] = useState<PassportInfo | null>(null);
  const [viewingAgreement, setViewingAgreement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      studentGet<{ room: StudentRoom | null; pending: PendingBooking | null }>('/api/student/room', '/student/room'),
      studentGet<StudentProfile>('/api/student/me', '/student/room'),
    ])
      .then(([r, me]) => { setRoom(r.room); setPending(r.pending); setPassport(me.passport); })
      .catch((e) => { if (e?.message !== 'signed out') setError("Couldn't load your room. Please refresh the page."); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  if (!room && pending) {
    return (
      <div className="max-w-4xl space-y-6">
        <h1 className="font-display text-3xl font-medium">My Room</h1>
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-3">
          <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-semibold text-amber-800 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-1 rounded">
            <Clock className="h-3.5 w-3.5" /> Reserved – waiting for payment confirmation
          </span>
          <h2 className="font-display text-2xl">{pending.room}, {pending.bed}</h2>
          <p className="text-sm text-muted-foreground">{pending.hostel} · Booking {pending.ref}{pending.arrivalDate ? ` · Arrival ${pending.arrivalDate}` : ''}</p>
          <p className="text-sm">Your room details appear here once our team confirms your payment.</p>
          <Link href="/student/bookings" className="inline-block text-sm text-primary hover:underline">See your booking</Link>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="max-w-4xl space-y-6">
        <h1 className="font-display text-3xl font-medium">My Room</h1>
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <h2 className="font-display text-xl">No room assigned yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Book a bed, and once our team confirms your payment, your room appears here.
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

      {room.booking && (
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl">Your booking</h2>
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
              <BadgeCheck className="h-4 w-4" /> Paid – confirmed
            </span>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><dt className="text-xs text-muted-foreground mb-1">Booking ref</dt><dd className="font-medium">{room.booking.ref}</dd></div>
            <div><dt className="text-xs text-muted-foreground mb-1">Arrival</dt><dd className="font-medium">{room.booking.arrivalDate || '–'}</dd></div>
            <div><dt className="text-xs text-muted-foreground mb-1">Rent</dt><dd className="font-medium">{room.booking.rent !== null ? `${formatPLN(room.booking.rent)}/month` : 'On request'}</dd></div>
            <div><dt className="text-xs text-muted-foreground mb-1">Deposit</dt><dd className="font-medium">{room.booking.deposit !== null ? formatPLN(room.booking.deposit) : 'On request'}</dd></div>
          </dl>
          <p className="flex items-start gap-2 rounded-lg bg-secondary/10 p-3 text-sm">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Minimum stay: 1 semester (6 months).
          </p>
          {/* Monthly rent: first due 30 days after the agreement, then the same day every month */}
          {room.booking.rentDue ? (
            room.booking.rentDue.overdueCount > 0 ? (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-200">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Rent overdue: {room.booking.rentDue.overdueCount} {room.booking.rentDue.overdueCount === 1 ? 'month' : 'months'}, {formatPLN(room.booking.rentDue.overdueAmount)}.
                  {room.booking.rentDue.next ? ` Due since ${showDate(room.booking.rentDue.next.dueDate)}.` : ''} Please pay as soon as possible.
                </span>
              </p>
            ) : room.booking.rentDue.next ? (
              <p className={`flex items-start gap-2 rounded-lg p-3 text-sm ${room.booking.rentDue.next.status === 'due' ? 'border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'bg-secondary/10'}`}>
                <Clock className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Next rent: <strong>{showDate(room.booking.rentDue.next.dueDate)}</strong> · {formatPLN(room.booking.rentDue.next.amount)}</span>
              </p>
            ) : null
          ) : !room.booking.agreementGeneratedAt && (
            <p className="flex items-start gap-2 rounded-lg bg-secondary/10 p-3 text-sm">
              <Clock className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Your monthly rent starts 30 days after your agreement is generated.
            </p>
          )}
          {room.booking.agreementGeneratedAt && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium">Your lease agreement is ready.</span>
              <button onClick={() => setViewingAgreement(true)} className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground">View agreement</button>
              <a href="/api/student/agreement?download=1" download className="rounded-lg border border-border px-3 py-1.5 font-medium">Download .docx</a>
            </div>
          )}
          {passport && !room.booking.agreementGeneratedAt && (
            <div className="border-t border-border pt-4 text-sm space-y-1">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Next steps</h3>
              {passport.status === 'verified' ? (
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Passport verified. Our team is preparing your lease agreement for signing.</p>
              ) : passport.status === 'submitted' ? (
                <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Passport sent. Our team is checking it; then we prepare your lease agreement.</p>
              ) : (
                <p className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />
                  {passport.status === 'rejected' ? 'Please check your passport details' : 'Add your passport details for your lease agreement'}
                  {' '}on <Link href="/student/profile" className="text-primary hover:underline">My Profile</Link>.
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
      {viewingAgreement && room.booking && (
        <AgreementViewer url="/api/student/agreement" title={`Lease agreement ${room.booking.ref}`} onClose={() => setViewingAgreement(false)} />
      )}
    </div>
  );
}
