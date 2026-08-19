'use client';

import { AlertTriangle, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, IconButton } from './ui';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${danger ? 'bg-red-50 text-red-600' : 'bg-[var(--theme-primary-soft)] text-[var(--theme-link)]'}`}><AlertTriangle size={19}/></div>
        <div className="min-w-0 flex-1"><h2 id="confirm-dialog-title" className="text-base font-semibold text-slate-900">{title}</h2>{message ? <p className="mt-1 text-sm leading-6 text-slate-500">{message}</p> : null}</div>
        <IconButton label="Close" onClick={onCancel}><X size={17}/></IconButton>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
      <div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></div>
    </div>
  </div>;
}
