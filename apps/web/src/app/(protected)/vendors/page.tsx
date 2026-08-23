'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { apiFetch } from '../../../lib/api-client';
import { Button, EmptyState, ErrorState, LoadingState } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { FormField } from '../../../components/form-field';

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
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Vendor name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/assets/vendors/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ name: trimmedName, contact: contact.trim() || undefined }) });
      } else {
        await apiFetch('/assets/vendors', { method: 'POST', body: JSON.stringify({ name: trimmedName, contact: contact.trim() || undefined }) });
      }
      cancelEdit();
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to save vendor.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/assets/vendors/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Unable to delete vendor.');
    } finally {
      setDeleting(false);
    }
  }

  function startEdit(vendor: Vendor) { setEditing(vendor); setName(vendor.name); setContact(vendor.contact ?? ''); }
  function cancelEdit() { setEditing(null); setName(''); setContact(''); }
  const filtered = useMemo(() => vendors.filter((vendor) => `${vendor.name} ${vendor.contact ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())), [vendors, query]);

  return <div className="mx-auto max-w-[1200px] space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Asset support</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Vendors</h1><p className="mt-2 text-sm text-slate-500">Maintain suppliers and service providers used across the inventory.</p></div><Button variant="secondary" onClick={() => void load()} loading={loading} icon={<RefreshCw size={16}/>}>Refresh</Button></header>
    {error && <ErrorState title="Vendor action failed" message={error} onRetry={() => void load()} />}
    <section className="panel p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Plus size={17} className="text-[var(--theme-link)]"/><h2 className="font-semibold text-slate-950">{editing ? 'Edit vendor' : 'Add vendor'}</h2></div>{editing && <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} icon={<X size={14}/>}>Cancel</Button>}</div>
      <form onSubmit={save} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><FormField label="Vendor name" required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Vendor name"/><FormField label="Contact" value={contact} onChange={(e)=>setContact(e.target.value)} placeholder="Contact / email / phone"/><div className="flex items-end"><Button type="submit" className="h-11 w-full" loading={saving} icon={<Plus size={16}/>}>{editing ? 'Save changes' : 'Add vendor'}</Button></div></form>
    </section>
    <section className="panel overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><label className="flex min-h-10 w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3"><Search size={16} className="text-slate-400"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search vendors" className="w-full bg-transparent py-2 text-sm outline-none"/></label><span className="text-xs text-slate-500">{filtered.length} vendors</span></div>
      {loading ? <LoadingState label="Loading vendors…"/> : filtered.length===0 ? <EmptyState title="No vendors found" text="Add your first supplier or service provider above."/> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Vendor</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((vendor)=><tr key={vendor.id} className="hover:bg-[var(--theme-primary-soft)]/40"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{vendor.name}</p><p className="font-mono text-[11px] text-slate-400">{vendor.id}</p></td><td className="px-5 py-4 text-slate-600">{vendor.contact||'—'}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Button type="button" variant="secondary" size="sm" onClick={()=>startEdit(vendor)} icon={<Pencil size={14}/>}>Edit</Button><Button type="button" variant="danger" size="sm" onClick={()=>setDeleteTarget(vendor)} icon={<Trash2 size={14}/>}>Delete</Button></div></td></tr>)}</tbody></table></div>}
    </section>
    <ConfirmDialog open={Boolean(deleteTarget)} title="Delete vendor?" message={deleteTarget?`This will remove “${deleteTarget.name}”. Any assets still referencing this vendor may prevent deletion.`:undefined} confirmLabel="Delete vendor" danger loading={deleting} onCancel={()=>!deleting&&setDeleteTarget(null)} onConfirm={()=>void remove()}/>
  </div>;
}
