'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BadgeCheck, BedDouble, CalendarCheck, Edit, FileText, Mail, MapPin, MessageCircle, Phone, Trash2, User, Wallet } from 'lucide-react';
import { AgreementViewer } from '@/components/AgreementViewer';
import { StudentAvatar } from '@/components/StudentAvatar';
import { staffPhotoUrl, uploadPhoto } from '@/lib/photoClient';
import { formatPLN, parseAmount } from '@/lib/currency';
import { unitDeposit } from '@/lib/propertyTypes';
import { bookingsOf, STAY_LABEL, studentStatus, studentStay, type StayBooking } from '@/lib/studentStay';
import { daysUntil, monthlyRent, RENT_STATUS_LABEL, rentSchedule, showDate, warsawDate, type RentPayment } from '@/lib/rent';
import { adminCard } from '@/components/staff/adminStyles';

// A student's page in the staff panel, from the database: personal details, where they stay
// (bed staff assigned, or their booking), their bookings, passport and lease agreement.

const BOOKING_STATUS: Record<string, string> = { held: 'On hold', paid: 'Paid', cancelled: 'Cancelled' };
const PASSPORT_STATUS: Record<string, string> = { none: 'Not entered yet', submitted: 'Submitted – to verify', verified: 'Verified', rejected: 'Sent back to correct' };

const card = adminCard;
const date = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–');

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{value || '–'}</dd>
    </div>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [bookings, setBookings] = useState<StayBooking[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [viewing, setViewing] = useState<StayBooking | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const changePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError('');
    const result = await uploadPhoto(`/api/staff/students/${id}/photo`, file);
    if (result.ok) setStudent((s: any) => ({ ...s, photoUploadedAt: result.photoUploadedAt }));
    else setPhotoError(result.message || '');
    setPhotoBusy(false);
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    setPhotoError('');
    const res = await fetch(`/api/staff/students/${id}/photo`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) setStudent((s: any) => ({ ...s, photoUploadedAt: null }));
    else setPhotoError("Couldn't remove the photo. Please try again.");
    setPhotoBusy(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/v1-students/${id}?depth=0`);
        if (res.status === 404) return setState('missing');
        if (!res.ok) throw new Error(String(res.status));
        setStudent(await res.json());
        const json = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const [b, p, o, rp] = await Promise.all([
          json('/api/v1-bot-bookings?where[type][equals]=bed_hold&limit=2000&depth=0&sort=-createdAt'),
          json('/api/v1-properties?limit=1000&depth=0'),
          json('/api/v1-room-overrides?limit=2000&depth=0'),
          json('/api/v1-rent-payments?limit=10000&depth=0'),
        ]);
        setRentPayments(rp?.docs || []);
        setBookings(b?.docs || []);
        setProperties(p?.docs || []);
        setOverrides(Object.fromEntries((o?.docs || []).map((x: any) => [x.overrideKey, x])));
        setState('ready');
      } catch {
        setState('error');
      }
    })();
  }, [id]);

  const deleteStudent = async () => {
    setDeleting(true);
    const res = await fetch(`/api/v1-students/${id}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) router.replace('/staff/students');
    else { setDeleting(false); setConfirmDelete(false); }
  };

  if (state === 'loading') return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading student details...</div>;
  if (state !== 'ready' || !student) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 pb-12 pt-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{state === 'error' ? "Couldn't load the student" : 'Student Not Found'}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{state === 'error' ? 'Check that you are signed in and try again.' : 'The student you are looking for does not exist.'}</p>
        <Link href="/staff/students" className="text-blue-600 hover:underline">Return to Students Directory</Link>
      </div>
    );
  }

  const stay = studentStay(student, bookings, properties, overrides);
  const own = bookingsOf(student, bookings);
  const passport = student.passportStatus || 'none';
  const whatsapp = String(student.whatsapp || student.phone || '').replace(/\D/g, '');

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8 sm:space-y-6 sm:pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href="/staff/students" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <StudentAvatar name={student.name} src={staffPhotoUrl(student)} size={64} className="ring-2 ring-white shadow" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{student.name || 'Student'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Student Profile</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
              <label className={`cursor-pointer text-blue-600 hover:underline ${photoBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                {photoBusy ? 'Saving…' : student.photoUploadedAt ? 'Change photo' : 'Add photo'}
                <input type="file" accept="image/*" className="sr-only" disabled={photoBusy} onChange={(e) => { changePhoto(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {student.photoUploadedAt && <button onClick={removePhoto} disabled={photoBusy} className="text-red-600 hover:underline disabled:opacity-50">Remove photo</button>}
              {photoError && <span role="alert" className="text-red-600">{photoError}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/staff/students/add?edit=${student.id}`} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm">
            <Edit className="w-4 h-4" /> Edit
          </Link>
          {confirmDelete ? (
            <span className="flex items-center gap-2 text-sm">
              Delete this student?
              <button onClick={deleteStudent} disabled={deleting} className="px-3 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting…' : 'Yes, Delete'}</button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700">No</button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Where they stay */}
      <section className={`${card} space-y-4 p-4 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-lg flex items-center gap-2"><BedDouble className="w-5 h-5 text-blue-600" /> Room & Bed</h2>
          {stay && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${stay.source === 'held' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
              {stay.source === 'assigned' ? 'Assigned by staff' : `Booking ${STAY_LABEL[stay.source].toLowerCase()}`}
            </span>
          )}
        </div>
        {stay ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Field label="Hostel" value={<span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{stay.hostel}</span>} />
            <Field label="Unit Type" value={stay.unitType} />
            <Field label="Room / unit" value={stay.unit} />
            <Field label="Floor" value={stay.floor} />
            <Field label="Bed" value={stay.bed} />
            <Field label="Bed type" value={stay.bedType} />
          </dl>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No room yet: no bed is assigned and the student has no booking on hold or paid.</p>
        )}
      </section>

      {/* Signed lease agreement (the newest generated one) */}
      {(() => {
        const signed = own.filter((b) => b.agreementGeneratedAt).sort((x, y) => String(y.agreementGeneratedAt).localeCompare(String(x.agreementGeneratedAt)))[0];
        return (
          <section className={`${card} space-y-3 p-4 sm:p-6`}>
            <h2 className="font-semibold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Lease agreement</h2>
            {signed ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm">
                  <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100"><BadgeCheck className="w-4 h-4 text-green-600" /> Agreement generated</p>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">
                    <span data-no-translate>{signed.ref}</span>{signed.hostel ? ` · ${signed.hostel}` : ''}{signed.room ? ` · ${[signed.room, signed.bed].filter(Boolean).join(', ')}` : ''} · {date(signed.agreementGeneratedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setViewing(signed)} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 inline-flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> View agreement
                  </button>
                  <a href={`/api/staff/bookings/${signed.id}/agreement?download=1`} download className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Download .docx</a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No agreement yet. Generate it on the <Link href="/staff/bookings" className="text-blue-600 hover:underline">Bookings</Link> page once the booking is paid and the passport is verified.
              </p>
            )}
          </section>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal details */}
        <section className={`${card} space-y-4 p-4 sm:p-6`}>
          <h2 className="font-semibold text-lg flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> Personal Details</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" value={student.name} />
            <Field label="Gender" value={student.gender} />
            <Field label="WhatsApp" value={whatsapp ? (
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 hover:underline">
                <MessageCircle className="w-3.5 h-3.5" /> +{whatsapp}
              </a>
            ) : ''} />
            <Field label="Phone" value={student.phone ? <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gray-400" />{student.phone}</span> : ''} />
            <Field label="Email" value={student.email ? <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-gray-400" />{student.email}</span> : ''} />
            <Field label="Planned Arrival" value={student.arrivalDate} />
            <Field label="Date of Birth" value={student.dateOfBirth} />
            <Field label="Status" value={studentStatus(student, stay)} />
            <Field label="Course" value={student.course} />
            <Field label="Year of Study" value={student.yearOfStudy} />
            <div className="col-span-2"><Field label="Home Address" value={student.address} /></div>
            <Field label="Emergency Contact" value={[student.emergencyName, student.emergencyRelation].filter(Boolean).join(', ')} />
            <Field label="Emergency phone" value={student.emergencyPhone} />
            <Field label="Portal password" value={Number(student.passwordVersion) > 0 ? 'Set' : 'Not set yet'} />
            <Field label="Joined" value={date(student.createdAt)} />
          </dl>
        </section>

        {/* Passport */}
        <section className={`${card} space-y-4 p-4 sm:p-6`}>
          <h2 className="font-semibold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Passport</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Status" value={
              <span className="inline-flex items-center gap-1">{passport === 'verified' && <BadgeCheck className="w-4 h-4 text-green-600" />}{PASSPORT_STATUS[passport] || passport}</span>
            } />
            <Field label="Passport number" value={student.passportNumber} />
            <Field label="Valid until" value={student.passportValidUntil} />
            <Field label="Passport copy" value={student.passportCopyUploadedAt ? (
              <a href={`/api/staff/students/${student.id}/passport-copy`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View passport copy</a>
            ) : 'No copy uploaded'} />
            {passport === 'rejected' && student.passportRejectReason && <div className="col-span-2"><Field label="Sent back because" value={student.passportRejectReason} /></div>}
          </dl>
          {passport === 'submitted' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Verify or reject it on the <Link href="/staff/bookings" className="text-blue-600 hover:underline">Bookings</Link> page (paid booking).</p>
          )}
        </section>
      </div>

      {/* Monthly rent (from 30 days after the agreement) */}
      {(() => {
        const today = warsawDate();
        const withRent = own
          .map((b) => ({ b, s: rentSchedule(b, monthlyRent(b, b.overrideKey ? overrides[b.overrideKey] : null), rentPayments, today) }))
          .filter((x) => x.s !== null);
        return (
          <section className={`${card} space-y-4 p-4 sm:p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-lg flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-600" /> Rent</h2>
              <Link href="/staff/rent" className="text-sm text-blue-600 hover:underline">Record payments on the Rent page</Link>
            </div>
            {withRent.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Rent starts 30 days after the agreement is generated; this student has no agreement yet.</p>
            ) : withRent.map(({ b, s }) => (
              <div key={b.id} className="space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {b.ref} · monthly {s!.amount !== null ? formatPLN(s!.amount) : 'not set'} · first due {showDate(s!.firstDue)}
                  {s!.next ? ` · next ${showDate(s!.next.dueDate)} (${s!.overdue.length ? `${s!.overdue.length} overdue, ${formatPLN(s!.overdueAmount)}` : daysUntil(s!.next.dueDate, today) === 0 ? 'today' : `in ${daysUntil(s!.next.dueDate, today)} days`})` : ' · all paid'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[...s!.periods].reverse().map((p) => (
                    <span key={p.dueDate} title={p.payment?.paidAt ? `Paid ${new Date(p.payment.paidAt).toLocaleDateString('en-GB')}` : undefined}
                      className={`px-2 py-1 rounded-md text-xs font-medium ${p.status === 'paid' ? 'bg-green-100 text-green-800' : p.status === 'overdue' ? 'bg-red-100 text-red-800' : p.status === 'due' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                      {showDate(p.dueDate)} · {RENT_STATUS_LABEL[p.status]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })()}

      {/* Bookings */}
      <section className={`${card} space-y-4 p-4 sm:p-6`}>
        <h2 className="font-semibold text-lg flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-blue-600" /> Bookings</h2>
        {own.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No bookings.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {own.map((b) => {
              const unit = b.overrideKey ? overrides[b.overrideKey] : undefined;
              const rent = typeof b.price === 'number' ? b.price : parseAmount(unit?.roomPrice);
              const deposit = typeof b.deposit === 'number' ? b.deposit : typeof b.price === 'number' ? b.price : unitDeposit(unit);
              return (
                <li key={b.id} className="py-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold">{b.ref}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.status === 'paid' ? 'bg-green-100 text-green-800' : b.status === 'held' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{BOOKING_STATUS[b.status] || b.status}</span>
                    <span className="text-xs text-gray-500">Booked {date(b.createdAt)}{b.paidAt ? ` · paid ${date(b.paidAt)}` : ''}</span>
                  </div>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <Field label="Hostel" value={b.hostel} />
                    <Field label="Room / bed" value={[b.room, b.bed].filter(Boolean).join(', ')} />
                    <Field label="Arrival" value={b.arrivalDate} />
                    <Field label="Rent / deposit" value={`${rent !== null ? `${formatPLN(rent)}/mo` : '–'} · ${deposit !== null ? formatPLN(deposit) : '–'}`} />
                  </dl>
                  {b.agreementGeneratedAt && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <button onClick={() => setViewing(b)} className="px-3 py-1.5 rounded-md font-medium border border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 inline-flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> View agreement
                      </button>
                      <a href={`/api/staff/bookings/${b.id}/agreement?download=1`} download className="px-3 py-1.5 rounded-md font-medium border border-gray-300 dark:border-gray-700">Download .docx</a>
                      <span className="text-xs text-gray-500">Generated {date(b.agreementGeneratedAt)}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">Mark paid, cancel and generate the agreement on the <Link href="/staff/bookings" className="text-blue-600 hover:underline">Bookings</Link> page.</p>
      </section>

      {viewing && (
        <AgreementViewer url={`/api/staff/bookings/${viewing.id}/agreement`} title={`Agreement ${viewing.ref}${student.name ? ` – ${student.name}` : ''}`} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
