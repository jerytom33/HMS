'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CalendarCheck, CheckCircle2, FileText, MessageCircle, Phone, RefreshCw, Search, XCircle } from 'lucide-react';
import { formatPLN } from '@/lib/currency';

// Bed holds and call requests from the WhatsApp bot and the student portal (v1-bot-bookings).
// Staff mark holds paid or cancel them (cancelling frees the bed) and tick off call requests.

type Booking = {
  id: string; ref: string; type: 'bed_hold' | 'call_request'; status: string; source?: string;
  name?: string; whatsapp?: string; phone?: string; email?: string; gender?: string;
  arrivalDate?: string; minStayAgreed?: boolean; hostel?: string; room?: string; floor?: string; bed?: string;
  price?: number; deposit?: number; notes?: string; createdAt: string;
};

/** The student behind a booking, for the passport check (v1-students). */
type Student = {
  id: string; whatsapp?: string; phone?: string;
  passportNumber?: string; passportValidUntil?: string; passportStatus?: string; passportRejectReason?: string;
};

const digits = (v?: string) => String(v || '').replace(/\D/g, '');

/** Unpaid holds are cancelled this long after booking (HOLD_EXPIRY_HOURS on the cron, default 72). */
const HOLD_HOURS = 72;

const STATUS: Record<string, { label: string; className: string }> = {
  held: { label: 'On hold', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  call_requested: { label: 'Call requested', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  called: { label: 'Called', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

const TABS = [
  { value: 'active', label: 'Active', match: (b: Booking) => b.status === 'held' || b.status === 'paid' },
  { value: 'held', label: 'On hold', match: (b: Booking) => b.status === 'held' },
  { value: 'paid', label: 'Paid', match: (b: Booking) => b.status === 'paid' },
  { value: 'calls', label: 'Calls to make', match: (b: Booking) => b.status === 'call_requested' },
  { value: 'passports', label: 'Passports to verify', match: (b: Booking, s?: Student) => b.status === 'paid' && s?.passportStatus === 'submitted' },
  { value: 'cancelled', label: 'Cancelled', match: (b: Booking) => b.status === 'cancelled' },
  { value: 'all', label: 'All', match: () => true },
] as { value: string; label: string; match: (b: Booking, s?: Student) => boolean }[];

// What staff can do with a booking in each status
const ACTIONS: Record<string, { status: string; label: string; confirm: string; note: string; danger?: boolean }[]> = {
  held: [
    { status: 'paid', label: 'Mark paid', confirm: 'Mark this booking as paid?', note: 'Marked paid' },
    { status: 'cancelled', label: 'Cancel', confirm: 'Cancel this booking and free the bed?', note: 'Cancelled', danger: true },
  ],
  paid: [{ status: 'cancelled', label: 'Cancel', confirm: 'Cancel this paid booking and free the bed?', note: 'Cancelled', danger: true }],
  call_requested: [{ status: 'called', label: 'Mark called', confirm: 'Mark this student as called?', note: 'Marked called' }],
};

const input = 'px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-900';
const date = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('active');
  const [hostel, setHostel] = useState('all');
  const [source, setSource] = useState('all');
  const [query, setQuery] = useState('');
  // Action awaiting confirmation, and the booking being saved
  const [pending, setPending] = useState<{ id: string; status: string } | null>(null);
  const [saving, setSaving] = useState('');
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  // Passport being rejected (booking id) and the reason typed for the student
  const [rejecting, setRejecting] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/v1-bot-bookings?limit=1000&sort=-createdAt&depth=0');
      if (!res.ok) throw new Error(String(res.status));
      setBookings((await res.json()).docs || []);
      const st = await fetch('/api/v1-students?limit=2000&depth=0');
      if (st.ok) setStudents((await st.json()).docs || []);
    } catch {
      setError("Couldn't load bookings. Check that you are signed in and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Students by WhatsApp number (also staff-created students who only have it as phone)
  const studentFor = useMemo(() => {
    const map = new Map<string, Student>();
    for (const s of students) for (const n of [digits(s.whatsapp), digits(s.phone)]) if (n && !map.has(n)) map.set(n, s);
    return (b: Booking) => map.get(digits(b.whatsapp));
  }, [students]);

  const hostels = useMemo(() => [...new Set(bookings.map((b) => b.hostel).filter(Boolean))].sort() as string[], [bookings]);
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.value, bookings.filter((b) => t.match(b, studentFor(b))).length])), [bookings, studentFor]);

  const shown = bookings.filter((b) => {
    if (!TABS.find((t) => t.value === tab)!.match(b, studentFor(b))) return false;
    if (hostel !== 'all' && b.hostel !== hostel) return false;
    if (source !== 'all' && (b.source || 'bot') !== source) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const digits = q.replace(/\D/g, '');
    return [b.ref, b.name, b.email, b.room, b.hostel, b.bed].some((v) => v?.toLowerCase().includes(q)) ||
      (digits.length >= 3 && [b.whatsapp, b.phone].some((v) => v?.includes(digits)));
  });

  const apply = async (b: Booking, action: { status: string; note: string }) => {
    setSaving(b.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1-bot-bookings/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action.status,
          notes: [b.notes, `${action.note} by staff ${new Date().toISOString()}.`].filter(Boolean).join('\n'),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setNotice({ ok: true, message: `${b.ref}: ${STATUS[action.status]?.label || action.status}.${action.status === 'cancelled' ? ' The bed is free again.' : ''}` });
      setPending(null);
      await load();
    } catch {
      setNotice({ ok: false, message: `Couldn't update ${b.ref}. Please try again.` });
    } finally {
      setSaving('');
    }
  };

  // Verify or reject the passport the student entered on the portal
  const setPassport = async (b: Booking, student: Student, status: 'verified' | 'rejected') => {
    setSaving(b.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1-students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          status === 'verified'
            ? { passportStatus: 'verified', passportRejectReason: '', passportVerifiedAt: new Date().toISOString() }
            : { passportStatus: 'rejected', passportRejectReason: reason.trim(), passportVerifiedAt: null },
        ),
      });
      if (!res.ok) throw new Error(String(res.status));
      setNotice({ ok: true, message: status === 'verified' ? `Passport verified for ${b.name || b.ref}. You can generate the agreement.` : `Passport sent back to ${b.name || b.ref} to correct.` });
      setRejecting('');
      setReason('');
      await load();
    } catch {
      setNotice({ ok: false, message: "Couldn't update the passport. Please try again." });
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Bookings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Bed holds and call requests from WhatsApp and the student portal. Unpaid holds are cancelled automatically after {HOLD_HOURS} hours.
          </p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} className="self-start sm:self-auto px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'On hold', value: counts.held, icon: CalendarCheck, tab: 'held' },
          { label: 'Paid', value: counts.paid, icon: CheckCircle2, tab: 'paid' },
          { label: 'Calls to make', value: counts.calls, icon: Phone, tab: 'calls' },
          { label: 'Cancelled', value: counts.cancelled, icon: XCircle, tab: 'cancelled' },
        ].map(({ label, value, icon: Icon, tab: t }) => (
          <button key={label} onClick={() => setTab(t)}
            className={`text-left bg-white dark:bg-gray-900 rounded-lg border p-4 shadow-sm transition-colors ${tab === t ? 'border-blue-500' : 'border-gray-200 dark:border-gray-800 hover:border-blue-300'}`}>
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">{label}<Icon className="h-4 w-4" /></div>
            <div className="text-2xl font-bold mt-1">{loading ? '–' : value}</div>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 space-y-3 rounded-t-lg">
          <div className="flex flex-wrap gap-2" role="tablist">
            {TABS.map((t) => (
              <button key={t.value} role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${tab === t.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {t.label} <span className="opacity-70">{counts[t.value] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ref, name, phone, room…" className={`${input} w-full pl-9`} />
            </div>
            <select value={hostel} onChange={(e) => setHostel(e.target.value)} className={input} aria-label="Hostel">
              <option value="all">All hostels</option>
              {hostels.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={input} aria-label="Source">
              <option value="all">WhatsApp & portal</option>
              <option value="bot">WhatsApp bot</option>
              <option value="portal">Student portal</option>
            </select>
          </div>
        </div>

        {notice && (
          <div role="status" className={`mx-4 mt-4 rounded-md p-3 text-sm ${notice.ok ? 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300' : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'}`}>
            {notice.message}
          </div>
        )}

        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading bookings…</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : shown.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No bookings here.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {shown.map((b) => {
              const status = STATUS[b.status] || { label: b.status, className: 'bg-gray-100 text-gray-600' };
              const expires = b.status === 'held' ? new Date(new Date(b.createdAt).getTime() + HOLD_HOURS * 3600_000) : null;
              const confirming = pending?.id === b.id ? ACTIONS[b.status]?.find((a) => a.status === pending.status) : undefined;
              return (
                <li key={b.id} className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold">{b.ref}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>{status.label}</span>
                        <span className="text-xs text-gray-500">{b.type === 'call_request' ? 'Call request' : 'Bed hold'} · {b.source === 'portal' ? 'Student portal' : 'WhatsApp bot'}</span>
                      </div>
                      <div className="font-medium">
                        {b.name || 'No name'}{b.gender ? <span className="text-sm font-normal text-gray-500"> · {b.gender[0].toUpperCase() + b.gender.slice(1)}</span> : null}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {b.whatsapp && (
                          <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 hover:underline">
                            <MessageCircle className="h-3.5 w-3.5" /> +{b.whatsapp}
                          </a>
                        )}
                        {b.phone && b.phone !== b.whatsapp && (
                          <a href={`tel:+${b.phone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="h-3.5 w-3.5" /> +{b.phone}</a>
                        )}
                        {b.email && <span>{b.email}</span>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500 space-y-0.5">
                      <div>Booked {date(b.createdAt)}</div>
                      {expires && <div className={expires.getTime() - Date.now() < 12 * 3600_000 ? 'text-red-600 font-medium' : ''}>Expires {date(expires.toISOString())}</div>}
                    </div>
                  </div>

                  {b.type === 'bed_hold' && (
                    <dl className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm rounded-md bg-gray-50 dark:bg-gray-950 p-3">
                      <div><dt className="text-xs text-gray-500">Hostel</dt><dd>{b.hostel || '–'}</dd></div>
                      <div><dt className="text-xs text-gray-500">Room / bed</dt><dd>{b.room || '–'}{b.bed ? `, ${b.bed}` : ''}{b.floor ? <span className="text-gray-500"> · {b.floor}</span> : null}</dd></div>
                      <div><dt className="text-xs text-gray-500">Arrival</dt><dd>{b.arrivalDate || '–'}</dd></div>
                      <div><dt className="text-xs text-gray-500">Rent / deposit</dt><dd>{typeof b.price === 'number' ? `${formatPLN(b.price)}/mo` : '–'} · {typeof b.deposit === 'number' ? formatPLN(b.deposit) : '–'}</dd></div>
                      <div><dt className="text-xs text-gray-500">Minimum stay</dt><dd>{b.minStayAgreed ? 'Agreed' : 'Not confirmed'}</dd></div>
                    </dl>
                  )}

                  {b.type === 'bed_hold' && b.status === 'paid' && (() => {
                    const st = studentFor(b);
                    const ps = st?.passportStatus || 'none';
                    return (
                      <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3 text-sm space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">Passport:</span>
                          {ps === 'none' && <span className="text-gray-500">not entered yet. The student adds it on the portal&apos;s My Profile page.</span>}
                          {ps !== 'none' && <span className="font-mono">{st?.passportNumber || '–'}</span>}
                          {ps !== 'none' && <span className="text-gray-500">valid until {st?.passportValidUntil || '–'}</span>}
                          {ps === 'submitted' && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">To verify</span>}
                          {ps === 'verified' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>}
                          {ps === 'rejected' && <span className="text-red-600">Sent back{st?.passportRejectReason ? `: ${st.passportRejectReason}` : ''}. Waiting for the student.</span>}
                        </div>
                        {st && (ps === 'submitted' || ps === 'verified') && (
                          rejecting === b.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="What should the student fix? (shown to them)" className={`${input} flex-1 min-w-[16rem]`} />
                              <button onClick={() => setPassport(b, st, 'rejected')} disabled={saving === b.id || !reason.trim()} className="px-3 py-1.5 rounded-md font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                                {saving === b.id ? 'Saving…' : 'Send back'}
                              </button>
                              <button onClick={() => { setRejecting(''); setReason(''); }} className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {ps === 'submitted' && (
                                <button onClick={() => setPassport(b, st, 'verified')} disabled={saving === b.id} className="px-3 py-1.5 rounded-md text-sm font-medium border border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/40 disabled:opacity-50">
                                  Verify passport
                                </button>
                              )}
                              <button onClick={() => { setRejecting(b.id); setReason(''); setNotice(null); }} className="px-3 py-1.5 rounded-md text-sm font-medium border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40">
                                {ps === 'verified' ? 'Send back to correct' : 'Reject'}
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })()}

                  {b.notes && <p className="text-xs text-gray-500 whitespace-pre-line">{b.notes}</p>}

                  {ACTIONS[b.status] && (
                    confirming ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span>{confirming.confirm}</span>
                        <button onClick={() => apply(b, confirming)} disabled={saving === b.id}
                          className={`px-3 py-1.5 rounded-md font-medium text-white disabled:opacity-50 ${confirming.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                          {saving === b.id ? 'Saving…' : `Yes, ${confirming.label.toLowerCase()}`}
                        </button>
                        <button onClick={() => setPending(null)} className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700">No</button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {b.type === 'bed_hold' && b.status === 'paid' && studentFor(b)?.passportStatus === 'verified' && (
                          // Lease agreement filled in from this booking and the verified passport, as an editable Word file
                          <a href={`/api/staff/bookings/${b.id}/agreement`} download
                            className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1.5">
                            <FileText className="h-4 w-4" /> Generate agreement
                          </a>
                        )}
                        {(ACTIONS[b.status] || []).map((a) => (
                          <button key={a.status} onClick={() => { setPending({ id: b.id, status: a.status }); setNotice(null); }}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium border ${a.danger ? 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40' : 'border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40'}`}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
