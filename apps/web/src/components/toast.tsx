'use client';

import { CheckCircle2, Info, Loader2, TriangleAlert, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ToastTone = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type ToastInput = { title: string; message?: string; tone?: ToastTone; duration?: number };
type ToastItem = ToastInput & { id: string };

type ToastContextValue = { toast: (input: ToastInput) => string; dismiss: (id: string) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

const config = {
  success: { Icon: CheckCircle2, box: 'border-emerald-200 bg-emerald-50/95', icon: 'bg-white text-emerald-600', title: 'text-emerald-950', bar: 'bg-emerald-500' },
  error: { Icon: XCircle, box: 'border-red-200 bg-red-50/95', icon: 'bg-white text-red-600', title: 'text-red-950', bar: 'bg-red-500' },
  warning: { Icon: TriangleAlert, box: 'border-amber-200 bg-amber-50/95', icon: 'bg-white text-amber-600', title: 'text-amber-950', bar: 'bg-amber-500' },
  info: { Icon: Info, box: 'border-sky-200 bg-sky-50/95', icon: 'bg-white text-sky-600', title: 'text-sky-950', bar: 'bg-sky-500' },
  loading: { Icon: Loader2, box: 'border-slate-200 bg-white/95', icon: 'bg-slate-50 text-slate-600', title: 'text-slate-950', bar: 'bg-slate-400' },
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const toast = useCallback((input: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const item = { ...input, tone: input.tone ?? 'info', duration: input.duration ?? 4200, id } as ToastItem;
    setItems((current) => [...current.slice(-3), item]);
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  return <ToastContext.Provider value={value}>{children}<ToastViewport items={items} onDismiss={dismiss} /></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

function ToastViewport({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  return <div className="fixed right-4 top-4 z-[1200] flex w-[min(92vw,380px)] flex-col gap-3" aria-label="Notifications" aria-live="polite">
    {items.map((item) => <ToastItemView key={item.id} item={item} onDismiss={onDismiss} />)}
  </div>;
}

function ToastItemView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const tone = item.tone ?? 'info';
  const entry = config[tone];
  const Icon = entry.Icon;
  useEffect(() => {
    if (tone === 'loading' || item.duration === 0) return;
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration ?? 4200);
    return () => window.clearTimeout(timer);
  }, [item.id, item.duration, onDismiss, tone]);
  return <div className={`ui-toast relative flex items-start gap-3 overflow-hidden rounded-2xl border p-3.5 shadow-xl backdrop-blur ${entry.box}`} role={tone === 'error' ? 'alert' : 'status'}>
    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-sm ${entry.icon}`}><Icon size={17} className={tone === 'loading' ? 'animate-spin' : ''} /></div>
    <div className="min-w-0 flex-1"><p className={`text-sm font-semibold ${entry.title}`}>{item.title}</p>{item.message ? <p className="mt-0.5 text-xs leading-5 text-slate-600">{item.message}</p> : null}</div>
    <button type="button" className="icon-button -mr-1 -mt-1 h-8 min-h-8 w-8 min-w-8" aria-label="Dismiss notification" onClick={() => onDismiss(item.id)}><X size={15} /></button>
    {tone !== 'loading' && item.duration !== 0 ? <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-0.5 origin-left ${entry.bar} ui-toast-progress`} style={{ animationDuration: `${item.duration ?? 4200}ms` }} /> : null}
  </div>;
}
