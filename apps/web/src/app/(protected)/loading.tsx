'use client';

export default function ProtectedLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="space-y-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
