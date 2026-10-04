'use client';

import { useCallback, useEffect, useState } from 'react';
import { BedSingle, CheckCircle2, Info, MapPin, Users } from 'lucide-react';

type Bed = { index: number; label: string; type: string; image: string | null };
type Room = {
  unit: string; label: string; hostel: string; location: string; floor: string; sharingLabel: string; freeBeds: number;
  price: string; deposit: string; amenities: string[]; image: string | null; genderPolicy: string; beds: Bed[];
};
type Booking = { ref: string; status: string; hostel: string; room: string; floor: string; bed: string; arrivalDate?: string; price: string; deposit: string };

const STATUS: Record<string, string> = { held: 'On hold — awaiting payment', paid: 'Paid', cancelled: 'Cancelled' };

export default function FindRoomPage() {
  const [me, setMe] = useState<{ name: string; whatsapp: string; gender: string; arrivalRange: { min: string; max: string } } | null>(null);
  // false for a browse session from the WhatsApp link: holding a bed then needs a WhatsApp code
  const [verified, setVerified] = useState(true);
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
  // Code step of a booking from a browse session
  const [codeSent, setCodeSent] = useState('');
  const [code, setCode] = useState('');

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
      setVerified(r.verified);
      // Pre-fill the arrival date the student gave on WhatsApp
      setArrivalDate((current) => current || r.arrivalDate || '');
      setRooms(r.rooms);
      setSharingOptions(r.sharingOptions);
      setGenderKnown(r.genderKnown);
      // Bookings are shown only after the number is verified
      setBookings(r.verified ? (await get('/api/student/bookings')).bookings : []);
    } catch (e: any) {
      if (e?.message !== 'signed out') setError("Couldn't load rooms. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sharing]);

  useEffect(() => { load(); }, [load]);

  const pick = (unit: string, bed: number) => {
    setPicked({ unit, bed });
    setResult(null);
    setCodeSent('');
    setCode('');
  };

  const post = async (url: string, body: object) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json().catch(() => ({}));
  };

  // Signed-in students hold straight away; from a browse session a code goes to WhatsApp first
  const holdOrSendCode = async () => {
    if (!picked) return;
    if (verified) return confirm();
    setBooking(true);
    setResult(null);
    try {
      const data = await post('/api/student/book/request-code', { unit: picked.unit, bed: String(picked.bed), arrivalDate, minStayAgreed: agreed });
      if (data.ok && data.codeRequired === false) { setVerified(true); return confirm(); }
      if (!data.ok) {
        setResult({ ok: false, message: data.message || 'Something went wrong. Please try again.' });
        if (data.reason === 'bed_taken' || data.reason === 'unit_not_found') { setPicked(null); load(); }
        return;
      }
      setCodeSent(data.message);
    } finally {
      setBooking(false);
    }
  };

  const confirm = async () => {
    if (!picked) return;
    setBooking(true);
    setResult(null);
    try {
      const data = await post('/api/student/book', { unit: picked.unit, bed: String(picked.bed), arrivalDate, minStayAgreed: agreed, ...(verified ? {} : { code }) });
      if (data.signedIn) setVerified(true);
      setResult({ ok: Boolean(data.ok), message: data.message || 'Something went wrong. Please try again.' });
      // A wrong or expired code keeps the code step open; anything else ends this booking attempt
      if (['invalid_code', 'expired_code', 'too_many_attempts', 'code_required'].includes(data.reason)) return;
      setPicked(null); setAgreed(false); setCodeSent(''); setCode('');
      load();
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Find a room</h1>
        {me && <p className="text-sm text-muted-foreground">{verified ? 'Signed in as' : 'Rooms for'} {me.name || 'student'} · +{me.whatsapp}{me.gender ? ` · ${me.gender}` : ''}</p>}
      </div>

      {!verified && (
        <div className="flex gap-2 rounded-lg border border-border bg-secondary/10 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Choose a bed and tap <strong>Hold this bed</strong>. We&apos;ll send a code to your WhatsApp to confirm it&apos;s you.</span>
        </div>
      )}

      {!genderKnown && (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>We don&apos;t know your gender yet, so you only see mixed rooms. Tell our WhatsApp assistant to see every room available to you.</span>
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
                    {codeSent ? (
                      <div className="space-y-2">
                        <p role="status" className="text-sm">{codeSent}</p>
                        <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="6-digit code" value={code} aria-label="Code from WhatsApp"
                          onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
                          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 tracking-widest" />
                        <button onClick={confirm} disabled={booking || code.replace(/\D/g, '').length !== 6}
                          className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">
                          {booking ? 'Holding your bed…' : 'Confirm booking'}
                        </button>
                        <button onClick={holdOrSendCode} disabled={booking} className="text-xs text-primary hover:underline disabled:opacity-50">Send a new code</button>
                      </div>
                    ) : (
                      <button onClick={holdOrSendCode} disabled={booking || !agreed || !arrivalDate}
                        className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">
                        {booking ? (verified ? 'Holding your bed…' : 'Sending code…') : 'Hold this bed'}
                      </button>
                    )}
                    <p className="text-xs text-muted-foreground">We keep the bed for you until payment; our team will contact you with the payment details.</p>
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
    </div>
  );
}
