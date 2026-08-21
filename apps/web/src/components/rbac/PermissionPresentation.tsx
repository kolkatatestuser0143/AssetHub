'use client';

import { Check, ShieldCheck } from 'lucide-react';

export const PERMISSION_META: Record<string, { label: string; group: string; description: string; tone: string }> = {
  'platform:console:access': { label: 'Access System Console', group: 'System Console', description: 'Open the platform administration console.', tone: 'violet' },
  'platform:overview:read': { label: 'View Dashboard', group: 'System Console', description: 'View platform overview and key metrics.', tone: 'violet' },
  'platform:tenants:read': { label: 'View Tenants', group: 'Tenant Management', description: 'View tenant organizations and status.', tone: 'blue' },
  'platform:tenants:manage': { label: 'Manage Tenants', group: 'Tenant Management', description: 'Create, activate, suspend and administer tenants.', tone: 'blue' },
  'platform:users:read': { label: 'View System Users', group: 'System Users', description: 'View platform administrator accounts.', tone: 'cyan' },
  'platform:users:manage': { label: 'Manage System Users', group: 'System Users', description: 'Manage platform administrator access and sessions.', tone: 'cyan' },
  'platform:roles:read': { label: 'View Roles', group: 'Roles & Permissions', description: 'View system roles and platform permissions.', tone: 'indigo' },
  'platform:roles:manage': { label: 'Manage Roles', group: 'Roles & Permissions', description: 'Create and manage platform roles.', tone: 'indigo' },
  'platform:billing:read': { label: 'View Billing', group: 'Billing', description: 'View plans, subscriptions and billing information.', tone: 'emerald' },
  'platform:billing:manage': { label: 'Manage Billing', group: 'Billing', description: 'Create plans and manage subscription entitlements.', tone: 'emerald' },
  'platform:audit:read': { label: 'View Audit Logs', group: 'Security & Audit', description: 'Review platform audit history and login activity.', tone: 'amber' },
  'platform:health:read': { label: 'View System Health', group: 'Monitoring', description: 'View service health and operational status.', tone: 'green' },
  'platform:analytics:read': { label: 'View Analytics', group: 'Analytics', description: 'View platform usage and analytics.', tone: 'sky' },
  'platform:settings:read': { label: 'View Platform Settings', group: 'Platform Settings', description: 'View system-wide configuration.', tone: 'slate' },
  'platform:settings:manage': { label: 'Manage Platform Settings', group: 'Platform Settings', description: 'Change system-wide configuration.', tone: 'slate' },
  'platform:support:read': { label: 'View Support', group: 'Support', description: 'View support information and tenant issues.', tone: 'rose' },
  'platform:support:manage': { label: 'Manage Support', group: 'Support', description: 'Manage support operations and interventions.', tone: 'rose' },
  'company:read': { label: 'View Companies', group: 'Organization', description: 'View companies within the tenant.', tone: 'blue' },
  'company:write': { label: 'Manage Companies', group: 'Organization', description: 'Create and update companies.', tone: 'blue' },
  'role:read': { label: 'View Roles', group: 'Access Control', description: 'View tenant roles and permission definitions.', tone: 'indigo' },
  'role:write': { label: 'Manage Roles', group: 'Access Control', description: 'Create and manage tenant roles.', tone: 'indigo' },
  'asset:read': { label: 'View Assets', group: 'Asset Management', description: 'View assets and asset details.', tone: 'emerald' },
  'asset:write': { label: 'Manage Assets', group: 'Asset Management', description: 'Create and update assets.', tone: 'emerald' },
  'asset:delete': { label: 'Delete Assets', group: 'Asset Management', description: 'Remove assets from the tenant.', tone: 'red' },
  'user:read': { label: 'View Users', group: 'People', description: 'View tenant users and employees.', tone: 'cyan' },
  'user:write': { label: 'Manage Users', group: 'People', description: 'Create, update and administer tenant users.', tone: 'cyan' },
  'vendor:read': { label: 'View Vendors', group: 'Procurement', description: 'View vendors and supplier records.', tone: 'orange' },
  'vendor:write': { label: 'Manage Vendors', group: 'Procurement', description: 'Create and update vendor records.', tone: 'orange' },
  'report:read': { label: 'View Reports', group: 'Reporting', description: 'View tenant reports.', tone: 'sky' },
  'report:write': { label: 'Manage Reports', group: 'Reporting', description: 'Create and manage report templates.', tone: 'sky' },
  'audit:read': { label: 'View Audit Logs', group: 'Security & Audit', description: 'View tenant audit history.', tone: 'amber' },
  'billing:read': { label: 'View License', group: 'Subscription', description: 'View the tenant plan and license status.', tone: 'emerald' },
};

const TONES: Record<string, string> = {
  violet: 'border-violet-200 bg-violet-50 text-violet-700 ring-violet-100',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700 ring-indigo-100',
  blue: 'border-blue-200 bg-blue-50 text-blue-700 ring-blue-100',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700 ring-cyan-100',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100',
  green: 'border-green-200 bg-green-50 text-green-700 ring-green-100',
  sky: 'border-sky-200 bg-sky-50 text-sky-700 ring-sky-100',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 ring-amber-100',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 ring-rose-100',
  orange: 'border-orange-200 bg-orange-50 text-orange-700 ring-orange-100',
  red: 'border-red-200 bg-red-50 text-red-700 ring-red-100',
  slate: 'border-slate-200 bg-slate-50 text-slate-700 ring-slate-100',
};

export function permissionMeta(key: string) {
  return PERMISSION_META[key] ?? {
    label: humanizePermissionKey(key),
    group: humanizePermissionGroup(key),
    description: 'Access controlled by this permission.',
    tone: 'slate',
  };
}

function humanizePermissionKey(key: string) {
  const parts = key.split(':');
  const action = parts[parts.length - 1] ?? '';
  const resource = parts[parts.length - 2] ?? parts[0] ?? '';
  return `${humanize(resource)} ${action === 'read' ? 'View' : action === 'write' || action === 'manage' ? 'Manage' : action === 'delete' ? 'Delete' : humanize(action)}`;
}

function humanizePermissionGroup(key: string) {
  const parts = key.split(':');
  return humanize(parts[1] ?? parts[0] ?? 'Permissions');
}

function humanize(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PermissionChip({ permissionKey }: { permissionKey: string }) {
  const meta = permissionMeta(permissionKey);
  return <span title={permissionKey} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONES[meta.tone]}`}><ShieldCheck size={12} />{meta.label}</span>;
}

export function PermissionPickerItem({ permissionKey, selected, onToggle }: { permissionKey: string; selected: boolean; onToggle: () => void }) {
  const meta = permissionMeta(permissionKey);
  return <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition hover:shadow-sm ${selected ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
    <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
    <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span>{meta.label}</span>{selected && <Check size={14} className="text-blue-600" />}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{meta.description}</span><span className="mt-1 block font-mono text-[10px] text-slate-400">{permissionKey}</span></span>
  </label>;
}
