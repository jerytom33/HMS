'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound } from 'lucide-react';

const MIN = 8;
const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary';

// The personal link from the WhatsApp bot: the student sets a password here and is signed in
function SetPassword() {
  const router = useRouter();
  const token = useSearchParams().get('t') || '';
  const [link, setLink] = useState<{ firstName: string; hasPassword: boolean } | null | 'invalid'>(null);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/student-auth/link?t=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => setLink(data.ok ? data : 'invalid'))
      .catch(() => setLink('invalid'));
  }, [token]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN) return setError(`Use at least ${MIN} characters.`);
    if (password !== repeat) return setError("The passwords don't match.");
    setSaving(true);
    try {
      const res = await fetch('/api/student-auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.reason === 'invalid_link') setLink('invalid');
        return setError(data.message || "Couldn't save your password. Please try again.");
      }
      router.replace('/student/rooms');
      router.refresh();
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (link === null) return <p className="text-sm text-muted-foreground">Checking your link…</p>;
  if (link === 'invalid') {
    return (
      <div className="space-y-4 text-sm">
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          This link has expired or was already used. Message our WhatsApp assistant for a new link.
        </p>
        <p>Already set a password? <Link href="/student/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {link.firstName ? `Hi ${link.firstName}! ` : ''}
        {link.hasPassword ? 'Choose a new password.' : 'Choose a password. Next time, sign in with your WhatsApp number and this password.'}
      </p>
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <input id="password" type="password" autoComplete="new-password" required minLength={MIN} maxLength={128} value={password}
          onChange={(e) => setPassword(e.target.value)} className={inputClass} autoFocus />
        <p className="text-xs text-muted-foreground">At least {MIN} characters.</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="repeat" className="text-sm font-medium">Repeat password</label>
        <input id="repeat" type="password" autoComplete="new-password" required maxLength={128} value={repeat}
          onChange={(e) => setRepeat(e.target.value)} className={inputClass} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={saving}
        className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save password and see rooms'}
      </button>
    </form>
  );
}

export default function StudentStartPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center font-display text-2xl font-bold">HMS</Link>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Set your password</h1>
          </div>
          <Suspense><SetPassword /></Suspense>
        </div>
      </div>
    </main>
  );
}
