'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, MessageCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [whatsapp, setWhatsapp] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Only follow same-site student paths after login
  const callback = searchParams.get('callbackUrl');
  const next = callback && callback.startsWith('/student') && !callback.startsWith('//') ? callback : '/student/rooms';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/student-auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.message || 'Could not sign you in. Please try again.');
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp number</label>
        <input id="whatsapp" type="tel" inputMode="tel" autoComplete="tel" required placeholder="+48 500 100 200" value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div className="space-y-1">
        <label htmlFor="code" className="text-sm font-medium">Login code</label>
        <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={7} placeholder="6-digit code" value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tracking-widest outline-none focus:ring-2 focus:ring-primary" />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={submitting}
        className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export default function StudentLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center font-display text-2xl font-bold">HMS</Link>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Student sign in</h1>
          </div>
          <ol className="mb-6 space-y-2 rounded-lg bg-secondary/10 p-4 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Message our WhatsApp assistant and ask for a <strong>login code</strong>.</span>
            </li>
            <li className="pl-6">Enter your WhatsApp number and the 6-digit code here. Each code works once, for 10 minutes.</li>
          </ol>
          <Suspense><LoginForm /></Suspense>
        </div>
      </div>
    </main>
  );
}
