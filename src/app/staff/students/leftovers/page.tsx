'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, Trash2 } from 'lucide-react';

import { adminCard, adminPage } from '@/components/staff/adminStyles';
import type { OrphanDeleteResult, OrphanReport } from '@/lib/orphanRecords';

async function fetchReport(): Promise<{ report: OrphanReport | null; error: string }> {
  const res = await fetch('/api/staff/students/leftovers').catch(() => null);
  const json = await res?.json().catch(() => null);
  return res?.ok && json?.ok ? { report: json, error: '' } : { report: null, error: json?.error || 'Could not load the records.' };
}

const showDay = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-GB') : '');

/** Records that still point to deleted students (e.g. test accounts): review, pick, delete. */
export default function LeftoverRecordsPage() {
  const [report, setReport] = useState<OrphanReport | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState(false);
  const [files, setFiles] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<OrphanDeleteResult | null>(null);

  const show = useCallback((result: { report: OrphanReport | null; error: string }) => {
    setError(result.error);
    if (!result.report) return;
    setReport(result.report);
    setPicked(new Set());
    setAssignments(false);
    setFiles(false);
  }, []);

  useEffect(() => { fetchReport().then(show); }, [show]);

  const toggle = (whatsapp: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(whatsapp)) next.delete(whatsapp); else next.add(whatsapp);
    return next;
  });

  const nothingPicked = !picked.size && !assignments && !files;

  const remove = async () => {
    setBusy(true);
    setError('');
    const res = await fetch('/api/staff/students/leftovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapps: [...picked], assignments, files }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(false);
    setConfirming(false);
    if (!res?.ok || !json?.ok) {
      setError(json?.error || 'Could not delete the records.');
      return;
    }
    setDone(json.deleted);
    show(await fetchReport());
  };

  const empty = report && !report.people.length && !report.assignments.length && !report.files.length;

  return (
    <div className={adminPage}>
      <div className="flex items-center gap-4">
        <Link href="/staff/students" aria-label="Back to students" className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Deleted students&apos; records</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Bookings, rent payments, agreements, bed assignments and files whose student no longer exists. Pick what to delete.
          </p>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {done && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Deleted {done.bookings} booking(s), {done.rentPayments} rent payment(s), {done.agreements} agreement(s), freed {done.assignments} bed(s), removed {done.files} file(s).
        </p>
      )}

      {!report && !error && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
      {empty && (
        <div className={`${adminCard} p-8 text-center text-sm text-gray-500 dark:text-gray-400`}>
          Nothing left over: every booking, bed and file belongs to an existing student.
        </div>
      )}

      {report && report.people.length > 0 && (
        <div className={adminCard}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Bookings without a student ({report.people.length} number{report.people.length !== 1 ? 's' : ''})</h2>
            <button
              type="button"
              onClick={() => setPicked(picked.size === report.people.length ? new Set() : new Set(report.people.map((p) => p.whatsapp)))}
              className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              {picked.size === report.people.length ? 'Select none' : 'Select all'}
            </button>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {report.people.map((p) => (
              <li key={p.whatsapp}>
                <label className="flex cursor-pointer items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-950">
                  <input type="checkbox" checked={picked.has(p.whatsapp)} onChange={() => toggle(p.whatsapp)} className="mt-1 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100" data-no-translate>{p.name || 'No name'} <span className="font-normal text-gray-500">+{p.whatsapp}</span></div>
                    <ul className="mt-1 space-y-0.5 text-sm text-gray-600 dark:text-gray-400">
                      {p.bookings.map((b) => (
                        <li key={b.id} data-no-translate>{b.ref} · {b.type === 'call_request' ? 'Call request' : 'Bed hold'} · {b.status}{b.place ? ` · ${b.place}` : ''}{b.createdAt ? ` · ${showDay(b.createdAt)}` : ''}</li>
                      ))}
                    </ul>
                    {(p.rentPayments > 0 || p.agreements > 0) && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Also deletes {p.rentPayments} rent payment(s) and {p.agreements} lease agreement(s).</p>
                    )}
                  </div>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report && (report.assignments.length > 0 || report.files.length > 0) && (
        <div className={`${adminCard} divide-y divide-gray-100 dark:divide-gray-800`}>
          {report.assignments.length > 0 && (
            <label className="flex cursor-pointer items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-950">
              <input type="checkbox" checked={assignments} onChange={(e) => setAssignments(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100">Free {report.assignments.length} bed(s) assigned to deleted students</div>
                <p className="mt-0.5 break-words text-sm text-gray-600 dark:text-gray-400" data-no-translate>
                  {report.assignments.map((a) => `Room ${a.overrideKey.slice(a.overrideKey.lastIndexOf('-') + 1)} bed ${String.fromCharCode(65 + a.bedIndex)}`).join(', ')}
                </p>
              </div>
            </label>
          )}
          {report.files.length > 0 && (
            <label className="flex cursor-pointer items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-950">
              <input type="checkbox" checked={files} onChange={(e) => setFiles(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
              <div className="font-medium text-gray-900 dark:text-gray-100">Remove passport copies and photos of {report.files.length} deleted student(s)</div>
            </label>
          )}
        </div>
      )}

      {report && !empty && (
        <div className="flex flex-col items-stretch gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-end dark:border-gray-800">
          {confirming ? (
            <>
              <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400"><AlertTriangle className="h-4 w-4 shrink-0" /> This permanently deletes the selected records.</p>
              <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="min-h-11 rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Cancel</button>
              <button type="button" onClick={remove} disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                <Trash2 className="h-4 w-4" /> {busy ? 'Deleting…' : 'Yes, delete'}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => { setDone(null); setConfirming(true); }} disabled={nothingPicked} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> Delete selected
            </button>
          )}
        </div>
      )}
    </div>
  );
}
