'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, MessageCircle } from 'lucide-react';

const REGISTER_URL = 'https://wa.me/48518827891';
const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Only follow same-site student paths after login
  const callback = searchParams.get('callbackUrl');
  const next = callback && callback.startsWith('/student') && !callback.startsWith('//') ? callback : '/student/rooms';

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/student-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setError(data.message || 'Could not sign you in. Please try again.'); return; }
      router.replace(next);
      router.refresh();
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={signIn} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp number</label>
        <input id="whatsapp" type="tel" inputMode="tel" autoComplete="username" required placeholder="+48 500 100 200" value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)} className={inputClass} />
        <p className="text-xs text-muted-foreground">With the country code.</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <input id="password" type="password" autoComplete="current-password" required maxLength={128} value={password}
          onChange={(e) => setPassword(e.target.value)} className={inputClass} />
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
          <Suspense><LoginForm /></Suspense>
          <p className="mt-6 flex items-start gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>New here or forgot your password? <a href={REGISTER_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Message us on WhatsApp</a> for your personal link to set a password.</span>
          </p>
        </div>
      </div>
    </main>
  );
}
