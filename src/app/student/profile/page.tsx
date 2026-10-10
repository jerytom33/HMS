'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Clock, Download, FileText, Lock, User } from 'lucide-react';
import { AgreementViewer } from '@/components/AgreementViewer';
import { StudentAvatar } from '@/components/StudentAvatar';
import { uploadPhoto } from '@/lib/photoClient';
import { studentGet, type PassportInfo, type StudentProfile } from '@/lib/studentClient';

/**
 * Photos are shrunk in the browser (longest side 2000 px, JPEG) to keep uploads small;
 * PDFs and photos the browser can't read (e.g. HEIC outside Safari) are sent as they are.
 */
async function prepareCopy(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

const MAX_COPY_MB = 4;

// Passport for the lease agreement: asked for once the booking is paid, then verified by staff
function PassportCard({ passport, onSaved }: { passport: PassportInfo; onSaved: () => void }) {
  const [number, setNumber] = useState(passport.number);
  const [validUntil, setValidUntil] = useState(passport.validUntilIso);
  const [copy, setCopy] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const editable = passport.allowed && passport.status !== 'verified';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const form = new FormData();
      form.set('passportNumber', number);
      form.set('passportValidUntil', validUntil);
      if (copy) {
        const blob = await prepareCopy(copy);
        if (blob.size > MAX_COPY_MB * 1024 * 1024) {
          setResult({ ok: false, message: `The file is too large. Please upload a photo or PDF under ${MAX_COPY_MB} MB.` });
          return;
        }
        form.set('copy', blob, blob === copy ? copy.name : 'passport.jpg');
      }
      const res = await fetch('/api/student/passport', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      setResult({ ok: Boolean(data.ok), message: data.message || "Couldn't save. Please try again." });
      if (data.ok) onSaved();
    } catch {
      setResult({ ok: false, message: "Couldn't save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="documents" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm scroll-mt-4">
      <div className="bg-secondary/5 px-6 py-4 border-b border-border flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="font-medium text-lg">Documents: passport copy</h2>
      </div>
      <div className="p-6 space-y-4">
        {passport.status === 'verified' ? (
          <p className="flex items-center gap-2 text-sm"><BadgeCheck className="h-4 w-4 text-primary" />
            Verified: passport {passport.number}, valid until {passport.validUntil}. Our team will prepare your agreement.
          </p>
        ) : !passport.allowed ? (
          <p className="text-sm text-muted-foreground">Once your booking is paid, you&apos;ll add your passport details here. We need them for your lease agreement.</p>
        ) : (
          <>
            {passport.status === 'submitted' && (
              <p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-primary" /> Waiting for our team to check. You can still correct the details below.</p>
            )}
            {passport.status === 'rejected' && (
              <p role="alert" className="text-sm text-destructive">Please check your passport details{passport.rejectReason ? `: ${passport.rejectReason}` : '.'}</p>
            )}
            {passport.status === 'none' && <p className="text-sm">Your booking is paid. Please add your passport details for your lease agreement.</p>}
          </>
        )}

        {editable && (
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Passport number</span>
              <input className={inputClass} value={number} maxLength={30} required autoComplete="off"
                onChange={(e) => setNumber(e.target.value.toUpperCase())} placeholder="As printed in your passport" />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Valid until</span>
              <input type="date" className={inputClass} value={validUntil} required onChange={(e) => setValidUntil(e.target.value)} />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Passport copy</span>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setCopy(e.target.files?.[0] || null)}
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary/10 file:px-3 file:py-2 file:text-sm file:font-medium" />
              <span className="block text-xs text-muted-foreground">
                {passport.copyUploadedAt
                  ? `Copy uploaded ${new Date(passport.copyUploadedAt).toLocaleDateString('en-GB')}. Choose a file only to replace it.`
                  : 'A clear photo or scan of the page with your photo (JPG, PNG, HEIC or PDF).'}
              </span>
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center gap-4">
              <button type="submit" disabled={saving || !number || !validUntil || (!copy && !passport.copyUploadedAt)}
                className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Sending…' : passport.status === 'none' ? 'Send for checking' : 'Send again'}
              </button>
              {result && <span className={`text-sm ${result.ok ? 'text-primary' : 'text-destructive'}`}>{result.message}</span>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function StudentProfilePage() {
  const [me, setMe] = useState<StudentProfile | null>(null);
  const [form, setForm] = useState({ email: '', course: '', yearOfStudy: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [viewingAgreement, setViewingAgreement] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const changePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError('');
    const uploaded = await uploadPhoto('/api/student/photo', file);
    if (uploaded.ok) setMe((m) => (m ? { ...m, photoUploadedAt: uploaded.photoUploadedAt } : m));
    else setPhotoError(uploaded.message || '');
    setPhotoBusy(false);
  };

  const fill = (m: StudentProfile) => {
    setMe(m);
    setForm({ email: m.email, course: m.course, yearOfStudy: m.yearOfStudy });
  };

  const reload = () => studentGet<StudentProfile>('/api/student/me', '/student/profile').then(fill).catch(() => {});

  useEffect(() => {
    studentGet<StudentProfile>('/api/student/me', '/student/profile')
      .then(fill)
      .catch((e) => { if (e?.message !== 'signed out') setError("Couldn't load your profile. Please refresh the page."); })
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/student/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { window.location.href = '/student/login?callbackUrl=/student/profile'; return; }
      if (!res.ok || !data.ok) { setResult({ ok: false, message: data.error || "Couldn't save. Please try again." }); return; }
      fill(data);
      setResult({ ok: true, message: 'Saved.' });
    } catch {
      setResult({ ok: false, message: "Couldn't save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !me) return <p className="text-sm text-destructive">{error}</p>;

  const locked = [
    { label: 'Full Name', value: me.name },
    { label: 'WhatsApp', value: me.whatsapp ? `+${me.whatsapp}` : '' },
    { label: 'Gender', value: me.gender },
    { label: 'Planned Arrival', value: me.arrivalDateText },
  ];
  const changed = form.email !== me.email || form.course !== me.course || form.yearOfStudy !== me.yearOfStudy;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 pb-10">
      <div>
        <h1 className="font-display text-3xl font-medium mb-1">My Profile</h1>
        <p className="text-muted-foreground text-sm">Your details as we have them.</p>
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-secondary/5 px-6 py-4 border-b border-border flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-medium text-lg">Personal Details</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <StudentAvatar name={me.name} src={me.photoUploadedAt ? `/api/student/photo?v=${encodeURIComponent(me.photoUploadedAt)}` : null} size={72} />
            <div className="space-y-1 text-sm">
              <label className={`inline-block cursor-pointer rounded-lg border border-border px-3 py-1.5 font-medium ${photoBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                {photoBusy ? 'Saving…' : me.photoUploadedAt ? 'Change photo' : 'Add your photo'}
                <input type="file" accept="image/*" className="sr-only" disabled={photoBusy} onChange={(e) => { changePhoto(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              <p className="text-xs text-muted-foreground">A clear photo of your face. Our team sees it next to your room.</p>
              {photoError && <p role="alert" className="text-xs text-destructive">{photoError}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {locked.map((f) => (
              <div key={f.label} className="space-y-1">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{f.label}</div>
                <div className="font-medium">{f.value || '—'}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" /> To change these, message us on WhatsApp.
          </p>
        </div>
      </div>

      {/* Documents: the signed lease agreement, once staff generated it */}
      <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-secondary/5 px-6 py-4 border-b border-border flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-medium text-lg">Documents: lease agreement</h2>
        </div>
        <div className="p-6">
          {me.agreement ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm">
                <p className="flex items-center gap-2 font-medium"><BadgeCheck className="h-4 w-4 text-primary" /> Your lease agreement is ready.</p>
                <p className="mt-1 text-muted-foreground">
                  <span data-no-translate>{me.agreement.ref}</span>{me.agreement.hostel ? ` · ${me.agreement.hostel}` : ''}{me.agreement.room ? ` · ${me.agreement.room}` : ''}
                  {` · ${new Date(me.agreement.generatedAt).toLocaleDateString('en-GB')}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setViewingAgreement(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  <FileText className="h-4 w-4" /> View agreement
                </button>
                <a href="/api/student/agreement?download=1" download className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium">
                  <Download className="h-4 w-4" /> Download .docx
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Your lease agreement appears here once our team has prepared it (after your payment and passport check).</p>
          )}
        </div>
      </div>

      {viewingAgreement && me.agreement && (
        <AgreementViewer url="/api/student/agreement" title={`Lease agreement ${me.agreement.ref}`} onClose={() => setViewingAgreement(false)} />
      )}

      <PassportCard key={`${me.passport.status}-${me.passport.number}`} passport={me.passport} onSaved={reload} />

      <form onSubmit={save} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-secondary/5 px-6 py-4 border-b border-border">
          <h2 className="font-medium text-lg">Contact & Studies</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</span>
            <input type="email" className={inputClass} value={form.email} maxLength={254}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Course</span>
            <input className={inputClass} value={form.course} maxLength={120}
              onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="e.g. Computer Science" />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Year of Study</span>
            <input className={inputClass} value={form.yearOfStudy} maxLength={20}
              onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })} placeholder="e.g. 2" />
          </label>
        </div>
        <div className="px-6 pb-6 flex items-center gap-4">
          <button type="submit" disabled={saving || !changed}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          {result && <span className={`text-sm ${result.ok ? 'text-primary' : 'text-destructive'}`}>{result.message}</span>}
        </div>
      </form>
    </div>
  );
}
