'use client';

import { useCallback, useEffect, useState } from 'react';
import { cancelBooking } from '@/lib/studentClient';
import { BedSingle, CheckCircle2, Info, MapPin, Users } from 'lucide-react';

type Bed = { index: number; label: string; type: string; image: string | null };
type Room = {
  unit: string; label: string; hostel: string; location: string; floor: string; sharingLabel: string; freeBeds: number;
  price: string; deposit: string; amenities: string[]; image: string | null; genderPolicy: string; beds: Bed[];
};
type Booking = { ref: string; status: string; hostel: string; room: string; floor: string; bed: string; arrivalDate?: string; price: string; deposit: string; canCancel?: boolean };

const STATUS: Record<string, string> = { held: 'On hold — awaiting payment', paid: 'Paid', cancelled: 'Cancelled' };

export default function FindRoomPage() {
  const [me, setMe] = useState<{ name: string; whatsapp: string; gender: string; arrivalRange: { min: string; max: string } } | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sharingOptions, setSharingOptions] = useState<{ value: number; label: string }[]>([]);
  const [genderKnown, setGenderKnown] = useState(true);
  const [sharing, setSharing] = useState<number | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Bed being booked: unit id + bed index
  const [picked, setPicked] = useState<{ unit: string; bed: number } | null>(null);
  const [arrivalDate, setArrivalDate] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [booking, setBooking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const get = async (url: string) => {
        const res = await fetch(url);
        if (res.status === 401) { window.location.href = '/student/login?callbackUrl=/student/rooms'; throw new Error('signed out'); }
        if (!res.ok) throw new Error(`Failed to load ${url}`);
        return res.json();
      };
      const r = await get(`/api/student/rooms${sharing ? `?sharing=${sharing}` : ''}`);
      setMe(r);
      // Pre-fill the arrival date the student gave on WhatsApp
      setArrivalDate((current) => current || r.arrivalDate || '');
      setRooms(r.rooms);
      setSharingOptions(r.sharingOptions);
      setGenderKnown(r.genderKnown);
      setBookings((await get('/api/student/bookings')).bookings);
    } catch (e: any) {
      if (e?.message !== 'signed out') setError("Couldn't load rooms. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sharing]);

  useEffect(() => { load(); }, [load]);

  // One booking per student: while one is on hold or paid, booking another is blocked
  const current = bookings.find((b) => b.status === 'held' || b.status === 'paid');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancelCurrent = async () => {
    if (!current) return;
    setBooking(true);
    setResult(await cancelBooking(current.ref));
    setConfirmCancel(false);
    setBooking(false);
    load();
  };

  const pick = (unit: string, bed: number) => {
    setPicked({ unit, bed });
    setResult(null);
  };

  // Booking another bed while one is on hold or paid: a popup asks to cancel the current one first
  const [conflict, setConflict] = useState<{ ref: string; place: string; canCancel: boolean } | null>(null);

  useEffect(() => {
    if (!conflict) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !booking) setConflict(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [conflict, booking]);

  const submitBooking = async () => {
    if (!picked) return;
    const res = await fetch('/api/student/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit: picked.unit, bed: String(picked.bed), arrivalDate, minStayAgreed: agreed }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.reason === 'already_booked') {
      // e.g. booked on WhatsApp meanwhile: same popup, keeping the chosen bed
      const b = bookings.find((x) => x.ref === data.bookingRef);
      setConflict({ ref: data.bookingRef, place: b ? `${b.room}, ${b.bed} — ${b.hostel}` : '', canCancel: Boolean(data.canCancel) });
      load();
      return;
    }
    setResult({ ok: Boolean(data.ok), message: data.message || 'Something went wrong. Please try again.' });
    setPicked(null); setAgreed(false);
    load();
  };

  const book = async () => {
    if (!picked) return;
    setResult(null);
    if (current) {
      setConflict({ ref: current.ref, place: `${current.room}, ${current.bed} — ${current.hostel}`, canCancel: Boolean(current.canCancel) });
      return;
    }
    setBooking(true);
    try { await submitBooking(); } finally { setBooking(false); }
  };

  // "Cancel it and book this bed": cancel the current booking, then hold the chosen bed
  const cancelAndBook = async () => {
    if (!conflict) return;
    setBooking(true);
    try {
      const cancelled = await cancelBooking(conflict.ref);
      if (!cancelled.ok) {
        setResult(cancelled);
        setConflict(null);
        load();
        return;
      }
      setConflict(null);
      await submitBooking();
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Find a room</h1>
        {me && <p className="text-sm text-muted-foreground">Signed in as {me.name || 'student'} · +{me.whatsapp}{me.gender ? ` · ${me.gender}` : ''}</p>}
      </div>


      {!genderKnown && (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>We don&apos;t know your gender yet, so you only see mixed rooms. Tell our WhatsApp assistant to see every room available to you.</span>
        </div>
      )}

      {current && (
        <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <p>
            You already have a booking: <strong>{current.ref}</strong> ({current.room}, {current.bed} — {current.hostel}).
            You can book only one bed.{' '}
            {current.canCancel ? 'To book a different bed, cancel this booking first.' : 'It is paid; to change it, please contact our team.'}
          </p>
          {current.canCancel && (confirmCancel ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>Cancel {current.ref} and free that bed?</span>
              <button onClick={cancelCurrent} disabled={booking} className="rounded-lg bg-destructive px-3 py-1.5 font-medium text-white disabled:opacity-50">
                {booking ? 'Cancelling…' : 'Yes, cancel'}
              </button>
              <button onClick={() => setConfirmCancel(false)} className="rounded-lg border border-border bg-background px-3 py-1.5">Keep it</button>
            </div>
          ) : (
            <button onClick={() => { setConfirmCancel(true); setResult(null); }} className="rounded-lg border border-amber-400 bg-background px-3 py-1.5 font-medium">
              Cancel my booking
            </button>
          ))}
        </div>
      )}

      {result && (
        <div role="status" className={`whitespace-pre-line rounded-lg border p-4 text-sm ${result.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200'}`}>
          {result.message}
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Sharing">
        {[{ value: null as number | null, label: 'All' }, ...sharingOptions].map((o) => (
          <button key={o.label} onClick={() => setSharing(o.value)} aria-pressed={sharing === o.value}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${sharing === o.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-secondary/10'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-secondary/10" />)}
        </div>
      ) : error ? (
        <div className="space-y-3 text-sm">
          <p>{error}</p>
          <button onClick={load} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">Retry</button>
        </div>
      ) : rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">No free beds right now{sharing ? ' for this sharing type' : ''}. Please check again soon.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rooms.map((r) => (
            <div key={r.unit} className="overflow-hidden rounded-xl border border-border bg-card">
              {r.image && <img src={r.image} alt={r.label} className="h-44 w-full object-cover" />}
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{r.label}</h2>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{r.hostel} · {r.floor}</p>
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium">{r.genderPolicy}</span>
                </div>
                <p className="flex items-center gap-1 text-sm"><Users className="h-3.5 w-3.5" />{r.sharingLabel} · {r.freeBeds} free</p>
                <p className="text-sm font-medium">{r.price} · {r.deposit}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Water, Electricity and Winter Heating included</p>
                {r.amenities.length > 0 && <p className="text-xs text-muted-foreground">{r.amenities.join(' · ')}</p>}

                <fieldset className="space-y-1.5">
                  <legend className="mb-1 text-sm font-medium">Choose a bed</legend>
                  {r.beds.map((b) => (
                    <label key={b.index} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary/10">
                      <input type="radio" name={`bed-${r.unit}`} checked={picked?.unit === r.unit && picked.bed === b.index}
                        onChange={() => pick(r.unit, b.index)} />
                      <BedSingle className="h-4 w-4" />
                      <span className="font-medium">{b.label}</span>
                      <span className="text-muted-foreground">{b.type}</span>
                      {b.image && <img src={b.image} alt="" className="ml-auto h-8 w-12 rounded object-cover" />}
                    </label>
                  ))}
                </fieldset>

                {picked?.unit === r.unit && (
                  <div className="space-y-3 rounded-lg bg-secondary/10 p-3">
                    <label className="block space-y-1 text-sm">
                      <span className="font-medium">Arrival date</span>
                      <input type="date" value={arrivalDate} min={me?.arrivalRange.min} max={me?.arrivalRange.max} onChange={(e) => setArrivalDate(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5" />
                    </label>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
                      <span>I agree to the minimum stay of <strong>6 months (1 semester)</strong>.</span>
                    </label>
                    <button onClick={book} disabled={booking || !agreed || !arrivalDate}
                      className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">
                      {booking ? 'Holding your bed…' : 'Hold this bed'}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {current ? 'You already have a booking; you will be asked to cancel it first.' : 'We keep the bed for you until payment; our team will contact you with the payment details.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {bookings.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Your bookings</h2>
          {bookings.map((b) => (
            <div key={b.ref} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm">
              <div>
                <p className="font-medium">{b.room} · {b.bed} — {b.hostel}</p>
                <p className="text-muted-foreground">Ref {b.ref}{b.arrivalDate ? ` · arrives ${b.arrivalDate}` : ''} · {b.price}</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5" />{STATUS[b.status] || b.status}</span>
            </div>
          ))}
        </section>
      )}

      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 id="conflict-title" className="font-display text-xl font-semibold">You already have a booking</h2>
            <p className="text-sm">
              <strong>{conflict.ref}</strong>{conflict.place ? ` (${conflict.place})` : ''}. You can book only one bed.
            </p>
            {conflict.canCancel ? (
              <p className="text-sm text-muted-foreground">To book this bed, cancel your current booking first. Its bed will be freed for others.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Your current booking is paid, so it can&apos;t be cancelled here. To change it, please contact our team.</p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => setConflict(null)} disabled={booking} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
                {conflict.canCancel ? 'Keep my booking' : 'OK'}
              </button>
              {conflict.canCancel && (
                <button onClick={cancelAndBook} disabled={booking} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {booking ? 'Working…' : 'Cancel it and book this bed'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
