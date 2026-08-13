'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/custom-fields')
      .then((data) => setFields(Array.isArray(data) ? data : data?.items ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load custom fields'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Configuration</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">Custom fields</h1>
        <p className="mt-2 text-sm text-slate-500">Define reusable fields for tenant assets.</p>
      </div>
      <div className="panel overflow-hidden">
        {loading && <div className="p-8 text-sm text-slate-500">Loading custom fields…</div>}
        {error && <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {!loading && !error && fields.length === 0 && <div className="p-10 text-center"><p className="font-semibold text-slate-900">No custom fields yet</p><p className="mt-1 text-sm text-slate-500">Create the first definition from the configuration tools.</p></div>}
        {!loading && !error && fields.length > 0 && (
          <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-6 py-3">Key</th><th className="px-6 py-3">Label</th><th className="px-6 py-3">Type</th></tr></thead><tbody className="divide-y divide-slate-100">{fields.map((field) => <tr key={field.key}><td className="px-6 py-4 font-mono text-xs text-slate-700">{field.key}</td><td className="px-6 py-4 font-medium text-slate-900">{field.label}</td><td className="px-6 py-4 text-slate-500">{field.fieldType}</td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
}
