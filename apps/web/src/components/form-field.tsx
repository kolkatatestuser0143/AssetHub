'use client';

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

function FieldShell({ label, htmlFor, required, hint, error, children }: { label: string; htmlFor?: string; required?: boolean; hint?: string; error?: string; children: ReactNode }) {
  return <div className="space-y-1.5"><label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-800">{label}{required ? <span className="ml-1 text-red-500" aria-hidden="true">*</span> : null}</label>{children}{error ? <p className="text-xs font-medium text-red-600" role="alert">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}</div>;
}

export function FormField({ label, id, hint, error, required, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string; error?: string; required?: boolean }) {
  return <FieldShell label={label} htmlFor={id} required={required} hint={hint} error={error}><input id={id} {...props} aria-invalid={Boolean(error) || undefined} className={`field w-full ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''} ${props.className ?? ''}`} /></FieldShell>;
}

export function FormSelect({ label, id, hint, error, required, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string; hint?: string; error?: string; required?: boolean }) {
  return <FieldShell label={label} htmlFor={id} required={required} hint={hint} error={error}><select id={id} {...props} aria-invalid={Boolean(error) || undefined} className={`field w-full ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''} ${props.className ?? ''}`}>{children}</select></FieldShell>;
}

export function FormTextarea({ label, id, hint, error, required, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; id: string; hint?: string; error?: string; required?: boolean }) {
  return <FieldShell label={label} htmlFor={id} required={required} hint={hint} error={error}><textarea id={id} {...props} aria-invalid={Boolean(error) || undefined} className={`field min-h-28 w-full resize-y ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''} ${props.className ?? ''}`} /></FieldShell>;
}
