'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { Check, ChevronDown, Loader2, MoreHorizontal, Plus, Search, X } from 'lucide-react';

export function PageHeader({ title, description, action, actionHref }: { title: string; description?: string; action?: string; actionHref?: string }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between page-section-enter">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? (
        actionHref ? (
          <Link href={actionHref} className="btn-primary ui-interactive shrink-0"><Plus size={16} />{action}</Link>
        ) : (
          <button type="button" className="btn-primary ui-interactive shrink-0"><Plus size={16} />{action}</button>
        )
      ) : null}
    </div>
  );
}

export function Toolbar({ placeholder = 'Search…' }: { placeholder?: string }) {
  return (
    <div className="panel mb-4 flex flex-col gap-3 p-3 sm:flex-row ui-surface-enter">
      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-[var(--theme-focus)] focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--theme-focus)_10%,transparent)]">
        <Search size={16} className="shrink-0 text-slate-400" />
        <input className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" placeholder={placeholder} />
      </label>
      <select className="field min-h-11 sm:w-44"><option>All statuses</option><option>Active</option><option>Inactive</option></select>
      <button type="button" className="btn-secondary ui-interactive">Filters</button>
    </div>
  );
}

export function Button({ children, className = '', loading = false, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const variantClass = variant === 'secondary' ? 'btn-secondary' : variant === 'ghost' ? 'btn-ghost' : variant === 'danger' ? 'btn-danger' : 'btn-primary';
  return <button {...props} disabled={loading || props.disabled} className={`${variantClass} ui-interactive ${className}`}>
    {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
    {children}
  </button>;
}

export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button {...props} aria-label={label} title={label} className={`icon-button ui-interactive ${className}`}>{children}</button>;
}

export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand'; className?: string }) {
  const toneClass = {
    neutral: 'badge-neutral',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    brand: 'badge-brand',
  }[tone];
  return <span className={`badge ${toneClass} ${className}`}>{children}</span>;
}

export function Skeleton({ className = '', children }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return <div className={`skeleton ${className}`} aria-hidden="true">{children}</div>;
}

export function EmptyState({ title = 'Nothing here yet', text = 'Create your first record to get started.', action = 'Create', onAction }: { title?: string; text?: string; action?: string; onAction?: () => void }) {
  return <div className="panel empty-state p-10 text-center">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--theme-primary)]/15 bg-[var(--theme-primary-soft)] text-[var(--theme-link)] shadow-sm"><Plus size={22} /></div>
    <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
    <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{text}</p>
    {onAction ? <Button className="mt-5" onClick={onAction}>{action}</Button> : <button type="button" className="btn-primary ui-interactive mt-5">{action}</button>}
  </div>;
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const panel = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="ui-modal-backdrop fixed inset-0 z-[90] grid place-items-center p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`ui-modal-panel w-full ${panel} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`} role="dialog" aria-modal="true" aria-labelledby="assethub-modal-title">
      <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1"><h2 id="assethub-modal-title" className="text-base font-semibold text-slate-950">{title}</h2>{description ? <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p> : null}</div>
        <IconButton label="Close" onClick={onClose}><X size={18} /></IconButton>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      {footer ? <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div> : null}
    </div>
  </div>;
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Confirm action', description, confirmLabel = 'Confirm', destructive = false, loading = false }: { open: boolean; onClose: () => void; onConfirm: () => void; title?: string; description?: string; confirmLabel?: string; destructive?: boolean; loading?: boolean }) {
  return <Modal open={open} onClose={onClose} title={title} description={description} size="sm" footer={<><button type="button" onClick={onClose} disabled={loading} className="btn-secondary ui-interactive">Cancel</button><button type="button" onClick={onConfirm} disabled={loading} className={`${destructive ? 'btn-danger' : 'btn-primary'} ui-interactive`}>{loading ? <Loader2 size={16} className="animate-spin" /> : null}{confirmLabel}</button></>}>{<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">This action may affect tenant data and should be reviewed before continuing.</div>}</Modal>;
}

export function Popover({ trigger, children, align = 'right' }: { trigger: ReactNode; children: ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);
  return <div ref={ref} className="relative inline-block">
    <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex">{trigger}</button>
    {open ? <div className={`ui-popover-panel absolute top-[calc(100%+8px)] z-[70] w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${align === 'left' ? 'left-0' : 'right-0'}`}>{children}</div> : null}
  </div>;
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="group relative inline-flex"><span>{children}</span><span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100">{label}</span></span>;
}

export function Toast({ title, message, tone = 'success', onClose }: { title: string; message?: string; tone?: 'success' | 'info' | 'warning' | 'danger'; onClose?: () => void }) {
  const Icon = tone === 'success' ? Check : tone === 'danger' ? X : tone === 'warning' ? MoreHorizontal : Search;
  return <div className={`ui-toast flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl ${tone === 'success' ? 'border-emerald-200' : tone === 'danger' ? 'border-red-200' : tone === 'warning' ? 'border-amber-200' : 'border-sky-200'}`} role="status">
    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone === 'success' ? 'bg-emerald-50 text-emerald-600' : tone === 'danger' ? 'bg-red-50 text-red-600' : tone === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600'}`}><Icon size={17} /></div>
    <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{title}</p>{message ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{message}</p> : null}</div>
    {onClose ? <IconButton label="Dismiss notification" onClick={onClose}><X size={16} /></IconButton> : null}
  </div>;
}

export function DataTable({ columns, rows, loading = false, emptyText = 'No records found.' }: { columns: string[]; rows: string[][]; loading?: boolean; emptyText?: string }) {
  return <div className="panel overflow-hidden ui-surface-enter">
    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-xs uppercase tracking-wide text-slate-500 backdrop-blur"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-5 py-3.5 font-semibold">{column}</th>)}<th className="w-10" /></tr></thead>
      <tbody className="divide-y divide-slate-100">
        {loading ? Array.from({ length: 6 }).map((_, index) => <tr key={index}>{columns.map((column) => <td key={column} className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>)}<td /></tr>) : rows.length === 0 ? <tr><td colSpan={columns.length + 1} className="px-6 py-14 text-center text-sm text-slate-500">{emptyText}</td></tr> : rows.map((row, index) => <tr key={index} className="ui-table-row hover:bg-[var(--theme-primary-soft)]/45">{row.map((value, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-5 py-4 text-slate-700">{cellIndex === row.length - 1 ? <Badge tone="success">{value}</Badge> : value}</td>)}<td><IconButton label="More actions"><MoreHorizontal size={17} /></IconButton></td></tr>)}
      </tbody>
    </table></div>
    <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Showing 1–{rows.length} of {rows.length}</span><div className="flex gap-2"><button type="button" className="btn-secondary px-3 py-1.5 text-xs">Previous</button><button type="button" className="btn-secondary px-3 py-1.5 text-xs">Next</button></div></div>
  </div>;
}
