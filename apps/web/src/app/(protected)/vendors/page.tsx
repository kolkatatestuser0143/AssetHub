'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';

type Vendor = { id: string; name: string; contact?: string };

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/assets/vendors');
      setVendors(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load vendors.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/assets/vendors/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: name.trim(), contact: contact.trim() || undefined }),
        });
      } else {
        await apiFetch('/assets/vendors', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), contact: contact.trim() || undefined }),
        });
      }
      setName('');
      setContact('');
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to save vendor.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(vendor: Vendor) {
    if (!window.confirm(`Delete vendor “${vendor.name}”?`)) return;
    setError(null);
    try {
      await apiFetch(`/assets/vendors/${vendor.id}`, { method: 'DELETE' });
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to delete vendor.');
    }
  }

  function startEdit(vendor: Vendor) {
    setEditing(vendor);
    setName(vendor.name);
    setContact(vendor.contact ?? '');
  }

  function cancelEdit() {
    setEditing(null);
    setName('');
    setContact('');
  }

  const filtered = useMemo(() => vendors.filter((vendor) => `${vendor.name} ${vendor.contact ?? ''}`.toLowerCase().includes(query.toLowerCase())), [vendors, query]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Asset support</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Vendors</h1>
          <p className="mt-2 text-sm text-slate-500">Maintain suppliers and service providers used across the inventory.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>Refresh</button>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Plus size={17} className="text-blue-600"/><h2 className="font-semibold text-slate-950">{editing ? 'Edit vendor' : 'Add vendor'}</h2></div>{editing && <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"><X size={14}/>Cancel</button>}</div>
        <form onSubmit={save} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Vendor name" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact / email / phone" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <button disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"><Plus size={16}/>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add vendor'}</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-md"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vendors" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500"/></div><span className="text-xs text-slate-500">{filtered.length} vendors</span></div>
        {loading ? <div className="space-y-3 p-5">{[1,2,3,4].map((n) => <div key={n} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div> : filtered.length === 0 ? <div className="p-14 text-center"><Building2 className="mx-auto text-slate-300" size={36}/><p className="mt-3 font-semibold text-slate-800">No vendors found</p><p className="mt-1 text-sm text-slate-500">Add your first supplier or service provider above.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Vendor</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((vendor) => <tr key={vendor.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{vendor.name}</p><p className="font-mono text-[11px] text-slate-400">{vendor.id}</p></td><td className="px-5 py-4 text-slate-600">{vendor.contact || '—'}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => startEdit(vendor)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"><Pencil size={14}/>Edit</button><button type="button" onClick={() => void remove(vendor)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 size={14}/>Delete</button></div></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
