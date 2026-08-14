'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, Mail, RefreshCw, ShieldCheck, UserCheck, UserX, Users, X } from 'lucide-react';
import { apiFetch } from '../../../../lib/api-client';
import UserSecurityPanel from '../../../../components/users/UserSecurityPanel';

type Permission = { id: string; key: string };
type RolePermission = { permissionId?: string; permissionKey?: string; permission?: Permission };
type Role = { id: string; name: string; isSystem: boolean; permissions?: RolePermission[] };
type User = { id: string; email: string; firstName: string; lastName: string; jobTitle?: string; phone?: string; companyId?: string; departmentId?: string; locationId?: string; isActive: boolean; forcePasswordReset?: boolean; roleIds?: string[] };

function permissionKey(item: RolePermission) { return item.permissionKey ?? item.permission?.key ?? ''; }

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [removingRoleId, setRemovingRoleId] = useState<string | null>(null);
  const [sendingAccess, setSendingAccess] = useState<'invite' | 'reset' | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [roleOpen, setRoleOpen] = useState(false);
  const [confirmRoleId, setConfirmRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadUser() {
    if (!userId) return;
    setLoading(true); setError(null);
    try { setUser(await apiFetch(`/users/${userId}`)); }
    catch (e: any) { setError(e?.message ?? 'Unable to load user'); }
    finally { setLoading(false); }
  }

  async function loadRoles() {
    setRolesLoading(true); setRoleError(null);
    try { const data = await apiFetch('/roles'); setRoles(Array.isArray(data) ? data : []); }
    catch (e: any) { setRoleError(e?.message ?? 'Unable to load roles'); setRoles([]); }
    finally { setRolesLoading(false); }
  }

  useEffect(() => { if (userId) void Promise.all([loadUser(), loadRoles()]); }, [userId]);

  const assignedIds = useMemo(() => new Set(user?.roleIds ?? []), [user?.roleIds]);
  const availableRoles = useMemo(() => roles.filter((role) => !assignedIds.has(role.id)), [roles, assignedIds]);

  async function toggleAccount() {
    if (!user) return;
    setError(null); setSuccess(null);
    try {
      await apiFetch(`/users/${user.id}/${user.isActive ? 'deactivate' : 'activate'}`, { method: 'PATCH' });
      setSuccess(user.isActive ? 'User account deactivated.' : 'User account activated.');
      await loadUser();
    } catch (e: any) { setError(e?.message ?? 'Unable to update account'); }
  }

  async function sendAccessEmail(action: 'invite' | 'reset') {
    if (!user) return;
    setSendingAccess(action); setError(null); setSuccess(null);
    try {
      const result = await apiFetch(`/users/${user.id}/access-email`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      if (result.emailSent) {
        setSuccess(action === 'invite' ? `Invitation email sent to ${user.email}.` : `Password reset email sent to ${user.email}.`);
      } else if (result.setupUrl) {
        await navigator.clipboard?.writeText(result.setupUrl).catch(() => undefined);
        setSuccess('SMTP email is not configured. The one-time setup link was generated and copied to your clipboard.');
      } else {
        setSuccess('Access link generated. Email delivery is currently disabled.');
      }
    } catch (e: any) { setError(e?.message ?? 'Unable to send access email.'); }
    finally { setSendingAccess(null); }
  }

  async function assignRole() {
    if (!user || !selectedRoleId) return;
    setAssigning(true); setRoleError(null); setSuccess(null);
    try {
      await apiFetch(`/roles/${selectedRoleId}/assign/${user.id}`, { method: 'POST' });
      setSelectedRoleId(''); setRoleOpen(false); setSuccess('Role assigned successfully.');
      await Promise.all([loadUser(), loadRoles()]);
    } catch (e: any) { setRoleError(e?.message ?? 'Unable to assign role'); }
    finally { setAssigning(false); }
  }

  async function unassignRole(roleId: string) {
    if (!user) return;
    setRemovingRoleId(roleId); setRoleError(null); setSuccess(null);
    try {
      await apiFetch(`/roles/${roleId}/assign/${user.id}`, { method: 'DELETE' });
      setConfirmRoleId(null);
      setSuccess('Role removed successfully.');
      await Promise.all([loadUser(), loadRoles()]);
    } catch (e: any) { setRoleError(e?.message ?? 'Unable to remove role'); }
    finally { setRemovingRoleId(null); }
  }

  const roleById = (id: string) => roles.find((role) => role.id === id);

  if (loading) return <div className="mx-auto max-w-6xl space-y-5"><div className="h-5 w-28 animate-pulse rounded bg-slate-100" /><div className="h-36 animate-pulse rounded-2xl bg-slate-100" /><div className="h-64 animate-pulse rounded-2xl bg-slate-100" /></div>;
  if (error || !user) return <div className="mx-auto max-w-6xl"><Link href="/users" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600"><ArrowLeft size={16}/> Back to users</Link><div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error ?? 'User not found'}</div></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/users" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"><ArrowLeft size={16}/> Back to users</Link>
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Users size={24}/></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">User profile</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{user.firstName} {user.lastName}</h1><p className="mt-1 text-sm text-slate-500">{user.email}</p></div></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!user.isActive || !!sendingAccess} onClick={() => void sendAccessEmail('invite')} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"><Mail size={16}/> {sendingAccess === 'invite' ? 'Sending…' : 'Send invite'}</button>
          <button type="button" disabled={!user.isActive || !!sendingAccess} onClick={() => void sendAccessEmail('reset')} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"><RefreshCw size={16}/> {sendingAccess === 'reset' ? 'Sending…' : 'Reset access'}</button>
          <button type="button" onClick={toggleAccount} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">{user.isActive ? <UserX size={16}/> : <UserCheck size={16}/>} {user.isActive ? 'Deactivate account' : 'Activate account'}</button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Profile</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">Email</dt><dd className="mt-1 font-medium text-slate-900">{user.email}</dd></div><div><dt className="text-slate-500">Job title</dt><dd className="mt-1 text-slate-900">{user.jobTitle || '—'}</dd></div><div><dt className="text-slate-500">Phone</dt><dd className="mt-1 text-slate-900">{user.phone || '—'}</dd></div><div><dt className="text-slate-500">Company</dt><dd className="mt-1 font-mono text-xs text-slate-700">{user.companyId || '—'}</dd></div></dl></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-slate-950">Access</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">Status</dt><dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></dd></div><div><dt className="text-slate-500">Password reset required</dt><dd className="mt-1 text-slate-900">{user.forcePasswordReset ? 'Yes' : 'No'}</dd></div><div><dt className="text-slate-500">Assigned roles</dt><dd className="mt-1 flex items-center gap-2 text-slate-900"><ShieldCheck size={15} className="text-blue-600"/>{user.roleIds?.length ?? 0}</dd></div></dl></section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-blue-600"/><h2 className="font-semibold text-slate-950">Roles</h2></div><p className="mt-1 text-sm text-slate-500">Assign tenant roles and review effective permissions.</p></div>
        {roleError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{roleError}</div>}
        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 md:flex-row">
          <div className="relative flex-1"><button type="button" disabled={rolesLoading || availableRoles.length === 0} onClick={() => setRoleOpen((v) => !v)} className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-700 disabled:opacity-60"><span>{selectedRoleId ? roles.find((r) => r.id === selectedRoleId)?.name : availableRoles.length ? 'Select a role' : 'No additional roles available'}</span><ChevronDown size={16} className="text-slate-400"/></button>
            {roleOpen && availableRoles.length > 0 && <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"><div className="max-h-72 overflow-y-auto p-1">{availableRoles.map((role) => <button type="button" key={role.id} onClick={() => { setSelectedRoleId(role.id); setRoleOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-slate-50"><span><span className="block text-sm font-semibold text-slate-900">{role.name}</span><span className="mt-1 block text-xs text-slate-500">{role.permissions?.length ?? 0} permissions</span></span>{role.isSystem && <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">System</span>}</button>)}</div></div>}
          </div>
          <button type="button" onClick={() => void assignRole()} disabled={!selectedRoleId || assigning} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{assigning ? <RefreshCw size={16} className="animate-spin"/> : <Check size={16}/>} Assign role</button>
        </div>
        <div className="mt-6 space-y-3">{(user.roleIds?.length ?? 0) === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No roles assigned.</div> : user.roleIds?.map((roleId) => { const role = roleById(roleId); const removing = removingRoleId === roleId; return <div key={roleId} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-slate-900">{role?.name ?? 'Role'}</p><p className="mt-1 font-mono text-xs text-slate-400">{roleId}</p></div><div className="flex items-center gap-2">{role?.isSystem && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">System role</span>}{confirmRoleId === roleId ? <><button type="button" onClick={() => void unassignRole(roleId)} disabled={removing} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{removing ? 'Removing…' : 'Confirm remove'}</button><button type="button" onClick={() => setConfirmRoleId(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><X size={13}/></button></> : <button type="button" onClick={() => setConfirmRoleId(roleId)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Remove</button>}</div></div>{role?.permissions?.length ? <div className="mt-4 flex flex-wrap gap-2">{role.permissions.map((item) => { const key = permissionKey(item); return key ? <span key={`${roleId}-${key}`} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"><Check size={12}/>{key}</span> : null; })}</div> : null}</div>; })}</div>
      </section>

      <UserSecurityPanel userId={user.id} />
    </div>
  );
}
