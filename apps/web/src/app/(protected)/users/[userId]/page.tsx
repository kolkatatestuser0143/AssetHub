'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronRight, Laptop, MapPin, Package, RefreshCw, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../../lib/api-client';
import UserSecurityPanel from '../../../../components/users/UserSecurityPanel';

type Permission = { id: string; key: string };
type RolePermission = { permissionId?: string; permissionKey?: string; permission?: Permission };
type Role = { id: string; name: string; isSystem: boolean; permissions?: RolePermission[] };
type Asset = { id: string; assetNumber: string; status: string; assetType?: { name?: string } };
type AssetRow = { assignment: { assignedAt?: string; returnedAt?: string }; asset: Asset };
type User = { id: string; employeeId?: string; email: string; firstName: string; lastName: string; jobTitle?: string; phone?: string; companyId?: string; departmentId?: string; locationId?: string; isActive: boolean; forcePasswordReset?: boolean; roleIds?: string[] };
type Employee360 = { user: User; assetSummary: { currentCount: number; typeCounts: Record<string, number> }; currentAssets: AssetRow[]; history: AssetRow[]; transfers: { id?: string; assetId: string; status: string; requestedAt?: string; completedAt?: string }[]; activity: { type: string; timestamp?: string; assetId: string; title: string; status?: string }[] };

function permissionKey(item: RolePermission) { return item.permissionKey ?? item.permission?.key ?? ''; }

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const [data, setData] = useState<Employee360 | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tab, setTab] = useState<'current' | 'history'>('current');
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [roleOpen, setRoleOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { setData(await apiFetch(`/users/${params.userId}/assets`)); }
    catch (e: any) { setError(e?.message ?? 'Unable to load employee.'); }
    finally { setLoading(false); }
  }
  async function loadRoles() {
    setRolesLoading(true); setRoleError(null);
    try { const result = await apiFetch('/roles'); setRoles(Array.isArray(result) ? result : []); }
    catch (e: any) { setRoleError(e?.message ?? 'Unable to load roles.'); }
    finally { setRolesLoading(false); }
  }
  useEffect(() => { if (params.userId) { void load(); void loadRoles(); } }, [params.userId]);

  async function toggleAccount() {
    if (!data) return;
    try { await apiFetch(`/users/${data.user.id}/${data.user.isActive ? 'deactivate' : 'activate'}`, { method: 'PATCH' }); setSuccess(data.user.isActive ? 'User account deactivated.' : 'User account activated.'); await load(); }
    catch (e: any) { setError(e?.message ?? 'Unable to update account.'); }
  }

  async function assignRole() {
    if (!data || !selectedRoleId) return;
    setAssigning(true); setRoleError(null); setSuccess(null);
    try { await apiFetch(`/roles/${selectedRoleId}/assign/${data.user.id}`, { method: 'POST' }); setSelectedRoleId(''); setRoleOpen(false); setSuccess('Role assigned successfully.'); await Promise.all([load(), loadRoles()]); }
    catch (e: any) { setRoleError(e?.message ?? 'Unable to assign role.'); }
    finally { setAssigning(false); }
  }

  const roleById = (id: string) => roles.find((role) => role.id === id);
  const availableRoles = useMemo(() => roles.filter((role) => !data?.user.roleIds?.includes(role.id)), [roles, data?.user.roleIds]);

  if (loading) return <div className="mx-auto max-w-[1400px] space-y-4"><div className="h-6 w-36 animate-pulse rounded bg-slate-100"/><div className="h-40 animate-pulse rounded-2xl bg-slate-100"/><div className="h-64 animate-pulse rounded-2xl bg-slate-100"/></div>;
  if (error || !data) return <div className="mx-auto max-w-5xl"><Link href="/users" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/>Back to users</Link><div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error ?? 'User not found.'}</div></div>;

  const { user, assetSummary, currentAssets, history, transfers, activity } = data;
  const rows = tab === 'current' ? currentAssets : history;
  return <div className="mx-auto max-w-[1400px] space-y-6">
    <div className="flex items-center justify-between"><Link href="/users" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/>Back to employees</Link><button onClick={() => { void load(); void loadRoles(); }} className="ui-interactive inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><RefreshCw size={15}/>Refresh</button></div>
    {success && <div className="ui-toast rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{success}</div>}
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]"><UserRoundIcon/></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-link)]">Employee 360</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{user.firstName} {user.lastName}</h1><p className="mt-1 text-sm text-slate-500">{user.employeeId || 'Employee ID not set'} · {user.email}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{user.jobTitle || 'No job title'}</span><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.isActive ? <UserCheck size={12}/> : <UserX size={12}/>} {user.isActive ? 'Active' : 'Inactive'}</span></div></div></div><div className="flex gap-2"><button onClick={toggleAccount} className="ui-interactive inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold">{user.isActive ? <UserX size={15}/> : <UserCheck size={15}/>} {user.isActive ? 'Deactivate' : 'Activate'}</button></div></div></header>

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(assetSummary.typeCounts).map(([name, count]) => <div key={name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">{name}</p><p className="mt-2 text-2xl font-bold text-slate-950">{count}</p></div>)}<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">Total assigned</p><p className="mt-2 text-2xl font-bold text-[var(--theme-primary)]">{assetSummary.currentCount}</p></div></section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-100 p-5"><Package size={17} className="text-[var(--theme-link)]"/><h2 className="font-semibold text-slate-900">Assigned assets</h2></div><div className="flex gap-1 border-b border-slate-100 px-4 pt-3"><button onClick={() => setTab('current')} className={`rounded-t-lg px-4 py-2 text-sm font-semibold ${tab === 'current' ? 'bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]' : 'text-slate-500'}`}>Assigned now</button><button onClick={() => setTab('history')} className={`rounded-t-lg px-4 py-2 text-sm font-semibold ${tab === 'history' ? 'bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]' : 'text-slate-500'}`}>History</button></div>{rows.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">{tab === 'current' ? 'No assets are currently assigned.' : 'No asset assignment history.'}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Asset</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Assigned</th><th className="px-5 py-3">Returned</th><th/></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, i) => <tr key={`${row.asset.id}-${i}`} className="hover:bg-[var(--theme-primary-soft)]/40"><td className="px-5 py-4"><Link href={`/assets/${row.asset.id}`} className="font-semibold text-slate-900 hover:text-[var(--theme-link)]">{row.asset.assetNumber}</Link></td><td className="px-5 py-4 text-slate-700">{row.asset.assetType?.name || 'Asset'}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{row.asset.status}</span></td><td className="px-5 py-4 text-xs text-slate-600">{row.assignment.assignedAt ? new Date(row.assignment.assignedAt).toLocaleDateString() : '—'}</td><td className="px-5 py-4 text-xs text-slate-600">{row.assignment.returnedAt ? new Date(row.assignment.returnedAt).toLocaleDateString() : 'Current'}</td><td className="px-5 py-4 text-right"><Link href={`/assets/${row.asset.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--theme-link)]">Open<ChevronRight size={14}/></Link></td></tr>)}</tbody></table></div>}</section>

    <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2 font-semibold text-slate-900"><Laptop size={17} className="text-[var(--theme-link)]"/>Recent asset activity</div>{activity.length === 0 ? <p className="mt-4 text-sm text-slate-500">No asset activity recorded.</p> : <div className="mt-5 space-y-4">{activity.slice(0, 10).map((item, i) => <div key={`${item.assetId}-${item.timestamp}-${i}`} className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--theme-primary)] ring-4 ring-[var(--theme-primary-soft)]"/><div><p className="text-sm font-semibold text-slate-900">{item.title}</p><Link href={`/assets/${item.assetId}`} className="text-xs font-semibold text-[var(--theme-link)]">{item.assetId}</Link><p className="mt-1 text-xs text-slate-400">{item.timestamp ? new Date(item.timestamp).toLocaleString() : '—'}</p></div></div>)}</div>}</section><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2 font-semibold text-slate-900"><MapPin size={17} className="text-[var(--theme-link)]"/>Employee details</div><dl className="mt-5 space-y-3 text-sm"><Detail label="Employee ID" value={user.employeeId || 'Not set'}/><Detail label="Email" value={user.email}/><Detail label="Phone" value={user.phone || '—'}/><Detail label="Department" value={user.departmentId || '—'}/><Detail label="Location" value={user.locationId || '—'}/></dl></section></div>

    {transfers.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-900">Transfers involving this employee</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Completed</th></tr></thead><tbody className="divide-y divide-slate-100">{transfers.map((t, i) => <tr key={t.id || `${t.assetId}-${i}`}><td className="px-4 py-3"><Link href={`/assets/${t.assetId}`} className="font-semibold text-[var(--theme-link)]">{t.assetId}</Link></td><td className="px-4 py-3">{t.status}</td><td className="px-4 py-3 text-xs text-slate-500">{t.requestedAt ? new Date(t.requestedAt).toLocaleString() : '—'}</td><td className="px-4 py-3 text-xs text-slate-500">{t.completedAt ? new Date(t.completedAt).toLocaleString() : '—'}</td></tr>)}</tbody></table></div></section>}

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--theme-link)]"/><h2 className="font-semibold text-slate-950">Roles & access</h2></div>{roleError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{roleError}</div>}<div className="mt-5 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 md:flex-row"><div className="relative flex-1"><button type="button" disabled={rolesLoading || availableRoles.length === 0} onClick={() => setRoleOpen((v) => !v)} className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-700 disabled:opacity-60"><span>{selectedRoleId ? roles.find((r) => r.id === selectedRoleId)?.name : availableRoles.length ? 'Select a role' : 'No additional roles available'}</span><ChevronDown size={16}/></button>{roleOpen && availableRoles.length > 0 && <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"><div className="max-h-72 overflow-y-auto p-1">{availableRoles.map((role) => <button key={role.id} type="button" onClick={() => { setSelectedRoleId(role.id); setRoleOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-slate-50"><span><span className="block text-sm font-semibold text-slate-900">{role.name}</span><span className="mt-1 block text-xs text-slate-500">{role.permissions?.length ?? 0} permissions</span></span>{role.isSystem && <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">System</span>}</button>)}</div></div>}</div><button type="button" onClick={() => void assignRole()} disabled={!selectedRoleId || assigning} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-5 text-sm font-semibold text-white disabled:opacity-50">{assigning ? <RefreshCw size={16} className="animate-spin"/> : <Check size={16}/>}Assign role</button></div><div className="mt-6 space-y-3">{(user.roleIds?.length ?? 0) === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No roles assigned.</div> : user.roleIds?.map((roleId) => { const role = roleById(roleId); return <div key={roleId} className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-900">{role?.name ?? 'Role'}</p><div className="mt-3 flex flex-wrap gap-2">{(role?.permissions ?? []).map((item) => { const key = permissionKey(item); return key ? <span key={`${roleId}-${key}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"><Check size={12}/>{key}</span> : null; })}</div></div>; })}</div></section>
    <UserSecurityPanel userId={user.id}/>
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-900">{value}</dd></div>; }
function UserRoundIcon() { return <Users size={25}/>; }
