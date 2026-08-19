'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const SAFE_ERROR = 'Something went wrong. Please try again. If the problem continues, contact your administrator.';

function safeMessage(message?: string) {
  if (!message || typeof message !== 'string') return SAFE_ERROR;
  const technical = /(exception|stack|traceback|mongodb|mongoose|nestjs|prisma|typescript|undefined|null|cannot read|syntaxerror|typeerror|referenceerror|server error|500|401|403|404|csrf token|validation failed)/i;
  return technical.test(message) ? SAFE_ERROR : message;
}

type DialogState = { open: boolean; title: string; message: string; tone: 'danger' | 'info' | 'success' };

export default function ThemeDialogBridge() {
  const [dialog, setDialog] = useState<DialogState>({ open: false, title: '', message: '', tone: 'danger' });

  useEffect(() => {
    const originalAlert = window.alert;
    const onAlert = (message?: string) => setDialog({ open: true, title: 'Unable to complete request', message: safeMessage(message), tone: 'danger' });
    const onError = () => setDialog({ open: true, title: 'Something went wrong', message: SAFE_ERROR, tone: 'danger' });
    const onUnhandledRejection = () => setDialog({ open: true, title: 'Something went wrong', message: SAFE_ERROR, tone: 'danger' });

    window.alert = onAlert;
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => { window.alert = originalAlert; window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onUnhandledRejection); };
  }, []);

  if (!dialog.open) return null;
  const Icon = dialog.tone === 'success' ? CheckCircle2 : dialog.tone === 'info' ? Info : AlertCircle;
  const iconTone = dialog.tone === 'success' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : dialog.tone === 'info' ? 'text-sky-600 bg-sky-50 border-sky-200' : 'text-red-600 bg-red-50 border-red-200';
  const close = () => setDialog((current) => ({ ...current, open: false }));

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"><div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="assethub-dialog-title"><div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${iconTone}`}><Icon size={20}/></div><div className="min-w-0 flex-1 pt-0.5"><h2 id="assethub-dialog-title" className="text-sm font-semibold text-slate-950">{dialog.title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{dialog.message}</p></div><button type="button" aria-label="Close" className="icon-button shrink-0" onClick={close}><X size={16}/></button></div><div className="flex justify-end px-5 py-4"><button type="button" className="btn-primary ui-interactive min-w-20 justify-center" onClick={close}>OK</button></div></div></div>;
}
