'use client';

export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50" role="status" aria-label="Loading AssetHub">
      <div className="flex w-56 flex-col items-center gap-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--theme-primary)]" />
        </div>
        <p className="text-sm font-medium text-slate-500">Loading AssetHub…</p>
      </div>
    </div>
  );
}
