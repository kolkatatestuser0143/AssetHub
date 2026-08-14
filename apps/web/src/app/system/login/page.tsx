'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff, LockKeyhole, Mail, ArrowLeft } from 'lucide-react';
import { systemLogin } from '../../../lib/api-client';

const ACCESS_TOKEN_KEY = 'itam_system_access_token';
const REFRESH_TOKEN_KEY = 'itam_system_refresh_token';

export default function SystemLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);

    try {
      const result = await systemLogin(email.trim(), password);
      sessionStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
      sessionStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
      router.replace('/system');
    } catch (err: any) {
      setError(err?.message ?? 'System login failed. Please verify your credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-12 text-white">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">AssetHub</span>
            </div>

            <div className="mt-28 max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">Platform Administration</p>
              <h1 className="mt-5 text-5xl font-bold leading-[1.08] tracking-tight xl:text-6xl">Control the platform. Protect every tenant.</h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-blue-100/80">The system console is reserved for platform administrators managing tenants, subscriptions, security policies and global configuration.</p>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-blue-200/70">
            <span>AssetHub System Console</span>
            <span>© 2026 AssetHub</span>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <button type="button" onClick={() => router.push('/login')} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Tenant login</button>

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-9">
              <div className="mb-8">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><ShieldCheck className="h-6 w-6" /></div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">System Administrator</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Sign in to console</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Use your platform administrator credentials. Tenant accounts cannot access this console.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="system-email" className="mb-2 block text-sm font-semibold text-slate-700">Email address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input id="system-email" required autoComplete="username" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@assethub.local" className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                  </div>
                </div>

                <div>
                  <label htmlFor="system-password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input id="system-password" required autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                    <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                </div>

                {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{error}</div>}

                <button type="submit" disabled={busy} className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in to System Console'}</button>
              </form>

              <div className="mt-7 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-400">Protected platform area · Unauthorized access is prohibited</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
