import { Users, ShieldAlert } from 'lucide-react';

export default function UsersPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Access</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Users</h1>
        <p className="mt-2 text-sm text-slate-500">Manage tenant identities, roles, sessions, and access lifecycle.</p>
      </div>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><ShieldAlert size={20}/></div>
          <div>
            <h2 className="font-semibold text-amber-950">Tenant user API required</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900/80">The current API does not expose tenant user CRUD/list endpoints yet, so AssetHub intentionally does not show fabricated user records here.</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-amber-800"><Users size={14}/>Expected backend surface: list, create/invite, update role, deactivate, reset access, session management.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
