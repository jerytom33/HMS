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
  const [code, setCode] = useState('');
  // 'number': enter the number; 'code': a code was requested, enter it
  const [step, setStep] = useState<'number' | 'code'>('number');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Only follow same-site student paths after login
  const callback = searchParams.get('callbackUrl');
  const next = callback && callback.startsWith('/student') && !callback.startsWith('//') ? callback : '/student/rooms';
  const linkExpired = searchParams.get('link') === 'expired';

  const post = async (url: string, body: object) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { res, data: await res.json().catch(() => ({})) };
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { res, data } = await post('/api/student-auth/request-code', { whatsapp });
      if (!res.ok || !data.ok) { setError(data.message || 'Could not send a code. Please try again.'); return; }
      setNotice(data.message);
      setStep('code');
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { res, data } = await post('/api/student-auth/verify', { whatsapp, code });
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
    <div className="space-y-4">
      {linkExpired && (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          That link has expired or isn&apos;t valid. Message our WhatsApp assistant for a new link, or sign in below.
        </p>
      )}
      {step === 'number' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp number</label>
            <input id="whatsapp" type="tel" inputMode="tel" autoComplete="tel" required placeholder="+48 500 100 200" value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)} className={inputClass} />
            <p className="text-xs text-muted-foreground">With the country code. We&apos;ll send you a code on WhatsApp.</p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            {submitting ? 'Sending…' : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={signIn} className="space-y-4">
          <p role="status" className="rounded-lg bg-secondary/10 p-3 text-sm">{notice}</p>
          <div className="space-y-1">
            <label htmlFor="code" className="text-sm font-medium">Code</label>
            <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={7} placeholder="6-digit code" value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} className={`${inputClass} tracking-widest`} autoFocus />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" className="text-primary hover:underline" onClick={() => { setStep('number'); setCode(''); setError(''); }}>Change number</button>
            <button type="button" className="text-primary hover:underline disabled:opacity-50" disabled={submitting} onClick={() => sendCode()}>Send a new code</button>
          </div>
        </form>
      )}
    </div>
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
            <span>Not registered yet? <a href={REGISTER_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Register on WhatsApp</a> to get your personal link.</span>
          </p>
        </div>
      </div>
    </main>
  );
}
