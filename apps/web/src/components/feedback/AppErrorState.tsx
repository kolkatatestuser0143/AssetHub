'use client';

import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function AppErrorState({
  title = 'Something went wrong',
  message = 'We could not complete this page. Please try again.',
  reset,
  homeHref = '/dashboard',
}: {
  title?: string;
  message?: string;
  reset?: () => void;
  homeHref?: string;
}) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-6">
      <section className="ui-surface-enter w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-950/5">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600"><AlertTriangle size={26} /></div>
        <h1 className="mt-5 text-xl font-bold text-slate-950">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {reset ? <button type="button" onClick={reset} className="btn-primary ui-interactive"><RefreshCw size={15} />Try again</button> : null}
          <a href={homeHref} className="btn-secondary ui-interactive"><Home size={15} />Go to dashboard</a>
        </div>
      </section>
    </main>
  );
}
