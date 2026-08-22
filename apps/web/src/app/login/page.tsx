'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../../lib/auth-context';
import { PasswordInput } from '../../components/password-input';

function LoginForm() {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const {login}=useAuth();
  const router=useRouter();

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setError('');
    setBusy(true);
    try{await login(email,password);router.push('/dashboard');}
    catch(x:any){setError(x.message||'Unable to sign in');}
    finally{setBusy(false);}
  }

  return <main className="min-h-screen bg-slate-950"><div className="grid min-h-screen lg:grid-cols-2"><section className="hidden bg-[var(--theme-primary)] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><img src="/assethub-logo-dark.svg" alt="AssetHub" className="h-auto w-[230px]"/><div className="mt-28 max-w-lg"><p className="text-sm uppercase tracking-widest text-white/70">Enterprise ITAM</p><h1 className="mt-4 text-5xl font-bold leading-tight">One workspace for your entire asset lifecycle.</h1><p className="mt-5 text-lg text-white/80">Inventory, ownership, compliance and administration in one secure platform.</p></div></div><p className="text-sm text-white/70">© 2026 AssetHub</p></section><section className="grid place-items-center bg-slate-50 p-6"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl"><div className="mb-8"><img src="/assethub-logo.svg" alt="AssetHub" className="mb-6 h-auto w-[210px]"/><h2 className="text-2xl font-bold text-slate-950">Welcome back</h2><p className="mt-1 text-sm text-slate-500">Sign in to your tenant workspace.</p></div><form onSubmit={submit} className="space-y-5"><label className="block text-sm font-semibold text-slate-700">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="field mt-2 w-full" placeholder="you@company.com"/></label><label className="block text-sm font-semibold text-slate-700">Password<PasswordInput required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2" placeholder="••••••••"/></label>{error&&<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}<button disabled={busy} className="btn-primary w-full">{busy?'Signing in…':'Sign in'}</button></form><a href="/system/login" className="mt-7 block text-center text-sm font-semibold text-[var(--theme-link)]">System administrator login →</a></div></section></div></main>;
}

export default function LoginPage(){
  return <AuthProvider><LoginForm/></AuthProvider>;
}
