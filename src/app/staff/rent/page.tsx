'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, ChevronDown, ChevronRight, MessageCircle, RefreshCw, Search, Users, Wallet } from 'lucide-react';
import { formatPLN } from '@/lib/currency';
import { monthlyRent, RENT_STATUS_LABEL, rentSchedule, showDate, daysUntil, warsawDate, DUE_SOON_DAYS, FIRST_RENT_AFTER_DAYS, type RentPayment, type RentPeriod, type RentSchedule } from '@/lib/rent';

// Monthly rent of every tenant with a lease agreement: rent starts 30 days after the agreement
// is generated and is due on the same day each month. Staff record each month's payment here.

type Booking = {
  id: string; ref: string; status: string; name?: string; whatsapp?: string; hostel?: string; room?: string; bed?: string;
  price?: number; overrideKey?: string; agreementGeneratedAt?: string;
};
type Row = { booking: Booking; schedule: RentSchedule };

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  due: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  upcoming: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};
const METHODS = [{ value: 'cash', label: 'Cash' }, { value: 'blik', label: 'BLIK' }, { value: 'transfer', label: 'Bank transfer' }, { value: 'other', label: 'Other' }];
const input = 'px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-900';

const dueText = (p: RentPeriod, today: string) => {
  const d = daysUntil(p.dueDate, today);
  if (p.status === 'paid') return 'Paid';
  if (d < 0) return `${-d} ${-d === 1 ? 'day' : 'days'} overdue`;
  if (d === 0) return 'Due today';
  return `in ${d} ${d === 1 ? 'day' : 'days'}`;
};

export default function RentPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [units, setUnits] = useState<Record<string, any>>({});
  const [me, setMe] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due' | 'upcoming'>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // The period being recorded ("bookingId|dueDate") and its form
  const [recording, setRecording] = useState('');
  const [form, setForm] = useState({ amount: '', method: 'cash', paidAt: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [undoing, setUndoing] = useState('');
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const today = warsawDate();

  const load = useCallback(async () => {
    setError('');
    try {
      const json = async (url: string) => { const r = await fetch(url); if (!r.ok) throw new Error(String(r.status)); return r.json(); };
      const [b, p, u, user] = await Promise.all([
        json('/api/v1-bot-bookings?where[type][equals]=bed_hold&where[status][equals]=paid&limit=2000&depth=0'),
        json('/api/v1-rent-payments?limit=10000&depth=0'),
        json('/api/v1-room-overrides?limit=2000&depth=0'),
        fetch('/api/users/me').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      setBookings(b.docs || []);
      setPayments(p.docs || []);
      setUnits(Object.fromEntries((u.docs || []).map((x: any) => [x.overrideKey, x])));
      setMe(user?.user?.username || user?.user?.email || '');
    } catch {
      setError("Couldn't load rent. Check that you are signed in and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows: Row[] = useMemo(() => bookings
    .map((booking) => ({ booking, schedule: rentSchedule(booking, monthlyRent(booking, booking.overrideKey ? units[booking.overrideKey] : null), payments, today) }))
    .filter((r): r is Row => r.schedule !== null)
    .sort((a, b) => String(a.schedule.next?.dueDate || '9999').localeCompare(String(b.schedule.next?.dueDate || '9999'))), [bookings, units, payments, today]);
  const notStarted = bookings.filter((b) => !b.agreementGeneratedAt).length;

  const thisMonth = today.slice(0, 7);
  const stats = {
    overdue: rows.filter((r) => r.schedule.overdue.length > 0),
    due: rows.filter((r) => r.schedule.next?.status === 'due'),
    collected: payments.filter((p) => String(p.paidAt || '').slice(0, 7) === thisMonth).reduce((s, p) => s + (Number(p.amount) || 0), 0),
  };

  const shown = rows.filter((r) => {
    const st = r.schedule.overdue.length ? 'overdue' : r.schedule.next?.status || 'upcoming';
    if (filter !== 'all' && st !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const b = r.booking;
    return [b.ref, b.name, b.hostel, b.room, b.whatsapp].some((v) => v?.toLowerCase().includes(q.replace(/^\+/, '')));
  });

  const startRecording = (b: Booking, p: RentPeriod) => {
    setRecording(`${b.id}|${p.dueDate}`);
    setForm({ amount: String(p.amount || ''), method: 'cash', paidAt: today, note: '' });
    setNotice(null);
  };

  const record = async (b: Booking, p: RentPeriod) => {
    const amount = Number(String(form.amount).replace(',', '.'));
    if (!(amount > 0)) { setNotice({ ok: false, message: 'Enter the amount received.' }); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/v1-rent-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: b.id, ref: b.ref, dueDate: p.dueDate, amount, method: form.method,
          paidAt: new Date(`${form.paidAt || today}T12:00:00Z`).toISOString(),
          name: b.name || '', whatsapp: b.whatsapp || '', hostel: b.hostel || '', room: [b.room, b.bed].filter(Boolean).join(', '),
          note: form.note.trim(), recordedBy: me,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setNotice({ ok: true, message: `Rent for ${showDate(p.dueDate)} recorded for ${b.name || b.ref}.` });
      setRecording('');
      await load();
    } catch {
      setNotice({ ok: false, message: "Couldn't record the payment (it may already be recorded). Refresh and try again." });
    } finally {
      setSaving(false);
    }
  };

  const undo = async (payment: RentPayment) => {
    if (!payment.id) return;
    setUndoing(payment.id);
    const res = await fetch(`/api/v1-rent-payments/${payment.id}`, { method: 'DELETE' }).catch(() => null);
    setNotice(res?.ok ? { ok: true, message: `Payment for ${showDate(payment.dueDate)} removed.` } : { ok: false, message: "Couldn't remove the payment. Please try again." });
    setUndoing('');
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Rent</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monthly rent of tenants with a lease agreement. The first rent is due {FIRST_RENT_AFTER_DAYS} days after the agreement is generated, then on the same day every month.
          </p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} className="self-start sm:self-auto px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Overdue', value: loading ? '–' : `${stats.overdue.length}`, note: loading ? '' : formatPLN(stats.overdue.reduce((s, r) => s + r.schedule.overdueAmount, 0)), icon: AlertTriangle, tone: 'text-red-600', tab: 'overdue' as const },
          { label: `Due in ${DUE_SOON_DAYS} days`, value: loading ? '–' : `${stats.due.length}`, note: loading ? '' : formatPLN(stats.due.reduce((s, r) => s + (r.schedule.next?.amount || 0), 0)), icon: CalendarClock, tone: 'text-amber-600', tab: 'due' as const },
          { label: 'Collected this month', value: loading ? '–' : formatPLN(stats.collected), note: '', icon: Wallet, tone: 'text-green-600', tab: 'all' as const },
          { label: 'Tenants paying rent', value: loading ? '–' : `${rows.length}`, note: notStarted ? `${notStarted} paid booking(s) without agreement yet` : '', icon: Users, tone: 'text-blue-600', tab: 'all' as const },
        ].map(({ label, value, note, icon: Icon, tone, tab }) => (
          <button key={label} onClick={() => setFilter(tab)} className={`text-left bg-white dark:bg-gray-900 rounded-lg border p-4 shadow-sm ${filter === tab && tab !== 'all' ? 'border-blue-500' : 'border-gray-200 dark:border-gray-800 hover:border-blue-300'}`}>
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">{label}<Icon className={`h-4 w-4 ${tone}`} /></div>
            <div className="text-2xl font-bold mt-1">{value}</div>
            {note && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{note}</div>}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex flex-col sm:flex-row gap-3 rounded-t-lg">
          <div className="flex flex-wrap gap-2">
            {(['all', 'overdue', 'due', 'upcoming'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-sm font-medium border ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {f === 'all' ? 'All' : RENT_STATUS_LABEL[f]}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ref, hostel, room…" className={`${input} w-full pl-9`} />
          </div>
        </div>

        {notice && (
          <div role="status" className={`mx-4 mt-4 rounded-md p-3 text-sm ${notice.ok ? 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300' : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'}`}>{notice.message}</div>
        )}

        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading rent…</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : shown.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">{rows.length === 0 ? 'No tenants pay rent yet. Rent starts once a paid booking’s agreement is generated.' : 'No tenants here.'}</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {shown.map(({ booking: b, schedule: s }) => {
              const next = s.next;
              const expanded = open[b.id];
              const wa = String(b.whatsapp || '').replace(/\D/g, '');
              return (
                <li key={b.id} className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{b.name || 'No name'}</span>
                        <span className="font-mono text-xs text-gray-500">{b.ref}</span>
                        {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 hover:underline"><MessageCircle className="h-3.5 w-3.5" /> +{wa}</a>}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{[b.hostel, [b.room, b.bed].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</div>
                      <div className="text-xs text-gray-500">Monthly rent {s.amount !== null ? formatPLN(s.amount) : 'not set'} · first due {showDate(s.firstDue)}</div>
                    </div>
                    <div className="text-right space-y-1">
                      {next ? (
                        <>
                          <div className="flex items-center justify-end gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[s.overdue.length ? 'overdue' : next.status]}`}>{RENT_STATUS_LABEL[s.overdue.length ? 'overdue' : next.status]}</span>
                            <span className="text-sm font-medium">{showDate(next.dueDate)}</span>
                          </div>
                          <div className="text-xs text-gray-500">{dueText(next, today)} · {formatPLN(next.amount)}</div>
                          {s.overdue.length > 1 && <div className="text-xs text-red-600 font-medium">{s.overdue.length} months overdue · {formatPLN(s.overdueAmount)}</div>}
                        </>
                      ) : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">All paid</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {next && recording !== `${b.id}|${next.dueDate}` && (
                      <button onClick={() => startRecording(b, next)} className="px-3 py-1.5 rounded-md text-sm font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40">
                        Record payment for {showDate(next.dueDate)}
                      </button>
                    )}
                    <button onClick={() => setOpen({ ...open, [b.id]: !expanded })} className="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-700 inline-flex items-center gap-1">
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} History ({s.periods.filter((p) => p.payment).length} paid)
                    </button>
                  </div>

                  {s.periods.map((p) => recording === `${b.id}|${p.dueDate}` && (
                    <div key={p.dueDate} className="rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-2">
                      <div className="text-sm font-medium">Record rent for {showDate(p.dueDate)}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <label className="text-xs space-y-1"><span className="text-gray-500">Amount (PLN)</span>
                          <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9.,]/g, '') })} inputMode="decimal" className={`${input} w-full`} /></label>
                        <label className="text-xs space-y-1"><span className="text-gray-500">Method</span>
                          <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={`${input} w-full`}>{METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
                        <label className="text-xs space-y-1"><span className="text-gray-500">Paid on</span>
                          <input type="date" value={form.paidAt} max={today} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} className={`${input} w-full`} /></label>
                        <label className="text-xs space-y-1"><span className="text-gray-500">Note (optional)</span>
                          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={200} className={`${input} w-full`} /></label>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => record(b, p)} disabled={saving} className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save payment'}</button>
                        <button onClick={() => setRecording('')} className="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-700">Cancel</button>
                      </div>
                    </div>
                  ))}

                  {expanded && (
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs text-gray-500"><th className="py-1">Due date</th><th>Status</th><th>Amount</th><th>Paid on</th><th>Method</th><th></th></tr></thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {[...s.periods].reverse().map((p) => (
                          <tr key={p.dueDate}>
                            <td className="py-1.5">{showDate(p.dueDate)}</td>
                            <td><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[p.status]}`}>{RENT_STATUS_LABEL[p.status]}</span></td>
                            <td>{formatPLN(p.amount)}</td>
                            <td>{p.payment?.paidAt ? new Date(p.payment.paidAt).toLocaleDateString('en-GB') : '–'}</td>
                            <td className="capitalize">{p.payment?.method || '–'}{p.payment?.note ? ` · ${p.payment.note}` : ''}</td>
                            <td className="text-right">
                              {p.payment ? (
                                <button onClick={() => undo(p.payment!)} disabled={undoing === p.payment.id} className="text-xs text-red-600 hover:underline disabled:opacity-50">{undoing === p.payment.id ? 'Removing…' : 'Undo'}</button>
                              ) : recording !== `${b.id}|${p.dueDate}` && (
                                <button onClick={() => startRecording(b, p)} className="text-xs text-blue-600 hover:underline">Record</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">Rent starts when the agreement is generated on the <Link href="/staff/bookings" className="text-blue-600 hover:underline">Bookings</Link> page.</p>
    </div>
  );
}
