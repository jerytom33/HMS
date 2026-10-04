'use client';

import { useEffect, useState } from 'react';
import { Lock, User } from 'lucide-react';
import { studentGet, type StudentProfile } from '@/lib/studentClient';

const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function StudentProfilePage() {
  const [me, setMe] = useState<StudentProfile | null>(null);
  const [form, setForm] = useState({ email: '', course: '', yearOfStudy: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const fill = (m: StudentProfile) => {
    setMe(m);
    setForm({ email: m.email, course: m.course, yearOfStudy: m.yearOfStudy });
  };

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
    <div className="max-w-4xl space-y-8 pb-10">
      <div>
        <h1 className="font-display text-3xl font-medium mb-1">My Profile</h1>
        <p className="text-muted-foreground text-sm">Your details as we have them.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-secondary/5 px-6 py-4 border-b border-border flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-medium text-lg">Personal Details</h2>
        </div>
        <div className="p-6 space-y-4">
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

      <form onSubmit={save} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
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
