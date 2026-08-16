'use client';

import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

export function PageHeader({ title, description, action, actionHref }: { title: string; description?: string; action?: string; actionHref?: string }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between page-section-enter"><div className="min-w-0"><h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>{description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}</div>{action ? actionHref ? <Link href={actionHref} className="btn-primary ui-interactive shrink-0"><Plus size={16}/>{action}</Link> : <button type="button" className="btn-primary ui-interactive shrink-0"><Plus size={16}/>{action}</button> : null}</div>;
}

export function Toolbar({ placeholder = 'Search…' }: { placeholder?: string }) {
  return <div className="panel mb-4 flex flex-col gap-3 p-3 sm:flex-row ui-surface-enter"><label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-[var(--theme-focus)] focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--theme-focus)_10%,transparent)]"><Search size={16} className="shrink-0 text-slate-400"/><input className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" placeholder={placeholder}/></label><select className="field min-h-11 sm:w-44"><option>All statuses</option><option>Active</option><option>Inactive</option></select><button type="button" className="btn-secondary ui-interactive">Filters</button></div>;
}

export function Button({ children, className = '', loading = false, variant = 'primary', size = 'md', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg' }) {
  const variantClass = variant === 'secondary' ? 'btn-secondary' : variant === 'ghost' ? 'btn-ghost' : variant === 'danger' ? 'btn-danger' : 'btn-primary';
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  return <button {...props} type={props.type ?? 'button'} disabled={loading || props.disabled} aria-busy={loading || undefined} className={`${variantClass} ${sizeClass} ui-interactive ${className}`}>{loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true"/> : null}{children}</button>;
}

export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button {...props} type={props.type ?? 'button'} aria-label={label} title={label} className={`icon-button ui-interactive ${className}`}>{children}</button>;
}

export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand' | 'info'; className?: string }) {
  const toneClass = { neutral: 'badge-neutral', success: 'badge-success', warning: 'badge-warning', danger: 'badge-danger', brand: 'badge-brand', info: 'badge-info' }[tone];
  return <span className={`badge ${toneClass} ${className}`}>{children}</span>;
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const normalized = status.toUpperCase();
  const tone = /ACTIVE|ASSIGNED|IN_STOCK|GOOD|NEW|COMPLETED|APPROVED|ACKNOWLEDGED|SUCCESS|ENABLED|HEALTHY/.test(normalized) ? 'success' : /PENDING|REQUESTED|IN_REPAIR|NEEDS_INSPECTION|WARNING|EXPIR|DUE/.test(normalized) ? 'warning' : /LOST|STOLEN|DAMAGED|REJECTED|FAILED|ERROR|DISABLED|OVERDUE|EXPIRED|DELETED/.test(normalized) ? 'danger' : 'neutral';
  const dotClass = { success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-red-500', neutral: 'bg-slate-400', brand: 'bg-[var(--theme-primary)]', info: 'bg-sky-500' }[tone];
  return <Badge tone={tone} className="gap-1.5 border border-transparent"><span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}/><span>{label ?? normalized.replaceAll('_', ' ')}</span></Badge>;
}

export function Alert({ title, message, tone = 'info', onClose }: { title: string; message?: string; tone?: 'info' | 'success' | 'warning' | 'danger'; onClose?: () => void }) {
  const config = { info: { icon: Info, classes: 'border-sky-200 bg-sky-50 text-sky-800', iconClasses: 'bg-white text-sky-600' }, success: { icon: CheckCircle2, classes: 'border-emerald-200 bg-emerald-50 text-emerald-800', iconClasses: 'bg-white text-emerald-600' }, warning: { icon: TriangleAlert, classes: 'border-amber-200 bg-amber-50 text-amber-800', iconClasses: 'bg-white text-amber-600' }, danger: { icon: AlertCircle, classes: 'border-red-200 bg-red-50 text-red-800', iconClasses: 'bg-white text-red-600' } }[tone];
  const Icon = config.icon;
  return <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${config.classes}`} role={tone === 'danger' ? 'alert' : 'status'}><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-sm ${config.iconClasses}`}><Icon size={17}/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p>{message ? <p className="mt-0.5 text-sm leading-5 opacity-80">{message}</p> : null}</div>{onClose ? <IconButton label="Dismiss" onClick={onClose}><X size={16}/></IconButton> : null}</div>;
}

export function ErrorState({ title = 'Something went wrong', message = 'We could not complete this request. Please try again.', onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return <div className="panel empty-state p-10 text-center" role="alert"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-red-200 bg-red-50 text-red-600 shadow-sm"><AlertCircle size={24}/></div><h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{message}</p>{onRetry ? <Button variant="secondary" className="mt-5" onClick={onRetry}><RefreshCw size={15}/>Try again</Button> : null}</div>;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <div className="panel flex min-h-40 items-center justify-center p-8" role="status" aria-live="polite"><div className="flex items-center gap-3 text-sm font-medium text-slate-500"><Loader2 size={18} className="animate-spin text-[var(--theme-link)]"/>{label}</div></div>;
}