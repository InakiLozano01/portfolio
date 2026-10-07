'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@/components/admin/console/kit';

/** Only console paths can be a post-login destination; anything else (other sites, javascript:) goes home. */
function safeCallback(raw: string | null) {
  if (!raw || raw.includes('//') || raw.includes('\\')) return '/admin';
  return /^\/admin(?:[/?#][^\s]*)?$/.test(raw) ? raw : '/admin';
}

const MESSAGES: Record<string, string> = {
  CredentialsSignin: 'Email or password is incorrect.',
  SessionRequired: 'Sign in to continue.',
};

const DOTS = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Crect x='10' y='10' width='1.6' height='1.6' fill='%23faf8f5' fill-opacity='0.14'/%3E%3C/svg%3E")`;

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = safeCallback(params.get('callbackUrl'));
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const expired = params.has('expired');
  const [error, setError] = useState(() => (expired ? 'Your session ended. Sign in again.' : MESSAGES[params.get('error') || ''] || ''));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // A revoked session still has a cookie: drop it instead of bouncing back to the console.
    if (expired) {
      if (status === 'authenticated') signOut({ redirect: false });
      return;
    }
    if (status === 'authenticated') window.location.replace(callbackUrl);
  }, [status, callbackUrl, expired]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', { redirect: false, email, password, callbackUrl });
      if (result?.error) {
        setError(MESSAGES[result.error] || result.error);
        setPassword('');
      } else if (result?.ok) {
        // A full navigation so the console renders with the new session from the server.
        window.location.replace(callbackUrl);
        return;
      }
    } catch {
      setError('Sign-in is unavailable right now. Try again in a minute.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="field-cream mt-8 rounded-3xl p-6 sm:p-8" noValidate aria-describedby={error ? 'login-error' : undefined}>
      <h1 className="text-2xl font-semibold tracking-[-0.025em] text-fg">Sign in</h1>
      <p className="mt-1 text-sm text-fg-soft">To edit the site, answer messages and send invoices.</p>
      <div className="mt-7 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-fg-soft">Email</span>
          <Input type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={error ? true : undefined} className="h-11" />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[13px] font-medium text-fg-soft">
            Password
            <button type="button" onClick={() => setShow((v) => !v)} className="inline-flex items-center gap-1 rounded-md text-[12px] font-normal text-fg-dim hover:text-fg" aria-pressed={show}>
              {show ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
              {show ? 'Hide' : 'Show'}
            </button>
          </span>
          <Input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={error ? true : undefined} className="h-11" />
        </label>
      </div>
      {error && (
        <p id="login-error" role="alert" className="mt-4 flex items-start gap-2 text-[13px] font-medium text-signal-text">
          <AlertCircle size={15} strokeWidth={2} className="mt-px shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" loading={loading} className="mt-6 h-11 w-full">
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

export default function AdminLogin() {
  return (
    <main className="synapse admin-ui field-navy relative grid min-h-dvh place-items-center overflow-hidden px-5 py-12">
      <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: DOTS }} />
      <span aria-hidden="true" className="absolute left-0 top-0 h-0.5 w-full bg-coral" />
      <div className="relative w-full max-w-[400px]">
        <div className="flex items-center gap-3">
          <Image src="/il-logo-mark.png" alt="" width={36} height={36} priority />
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight text-fg">Iñaki F. Lozano</p>
            <p className="text-[13px] text-fg-dim">Console</p>
          </div>
        </div>
        <Suspense fallback={<div className="field-cream mt-8 h-[380px] rounded-3xl" />}>
          <LoginForm />
        </Suspense>
        <Link href="/en" className="mt-6 inline-flex items-center gap-1.5 rounded-md text-[13px] text-fg-dim transition-colors hover:text-fg">
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          Back to the site
        </Link>
      </div>
    </main>
  );
}
