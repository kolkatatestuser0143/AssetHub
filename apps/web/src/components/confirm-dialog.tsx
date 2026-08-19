'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './ui';
import { Modal, ModalBody, ModalFooter } from './modal';

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
  return (
    <Modal open={open} onClose={onCancel} size="md" closeOnBackdrop={!loading}>
      <ModalBody>
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${danger ? 'bg-red-50 text-red-600' : 'bg-[var(--theme-primary-soft)] text-[var(--theme-link)]'}`}>
            <AlertTriangle size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {message ? <p className="mt-1 text-sm leading-6 text-slate-500">{message}</p> : null}
          </div>
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </ModalFooter>
    </Modal>
  );
}
