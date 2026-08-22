'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';

const labels: Record<string,string> = {
  dashboard: 'Dashboard', assets: 'Assets', 'asset-types': 'Asset Types', assignments: 'Asset Operations', transfers: 'Transfers', employees: 'Employees', 'tenant-admins': 'Tenant Admins', companies: 'Companies', plants: 'Sites', locations: 'Locations', 'business-units': 'Departments', roles: 'Roles & Permissions', identity: 'Identity & SSO', audit: 'Audit Logs', settings: 'Settings', license: 'License', acknowledgements: 'Acknowledgements', vendors: 'Vendors', warranties: 'Warranties', reports: 'Reports', lifecycle: 'Lifecycle', labels: 'Labels', import: 'Import', system: 'System', analytics: 'Analytics', tenants: 'Tenants', users: 'Platform Users', plans: 'Plans', subscriptions: 'Subscriptions', usage: 'Usage', security: 'Security', health: 'System Health', operations: 'Background Jobs', 'access-review': 'Access Review', 'user-control': 'User Control', 'primary-login-email': 'Primary Login Email', entitlements: 'Entitlements', 'account-linking': 'Account Linking', mapping: 'Mapping', provisioning: 'Provisioning', conflicts: 'Conflicts', scim: 'SCIM', monitoring: 'Monitoring', providers: 'Providers', setup: 'Setup', status: 'Status', rbac: 'RBAC', promotions: 'Promotions'
};

function humanize(segment: string) { return labels[segment] ?? segment.replace(/[-_]/g,' ').replace(/\b\w/g, c => c.toUpperCase()); }
function isId(segment: string) { return /^[0-9a-f]{8,}$/i.test(segment) || /^[0-9]+$/.test(segment); }

export default function Breadcrumbs({ system = false }: { system?: boolean }) {
  const pathname = usePathname();
  const root = system ? '/system' : '/dashboard';
  const prefix = system ? '/system' : '';
  const raw = pathname.replace(prefix,'').split('/').filter(Boolean);
  const items = [{ href: root, label: system ? 'System' : 'Dashboard', home: true }];
  let current = prefix;
  for (const segment of raw) {
    current += `/${segment}`;
    if (isId(segment)) continue;
    items.push({ href: current, label: humanize(segment), home: false });
  }
  const deduped = items.filter((item, index) => index === 0 || item.href !== items[index-1].href);
  return <nav aria-label="Breadcrumb" className="ui-breadcrumbs hidden items-center gap-1.5 text-xs sm:flex">
    {deduped.map((item, index) => <span key={`${item.href}-${index}`} className="flex min-w-0 items-center gap-1.5">
      {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />}
      {index === deduped.length - 1 ? <span className="max-w-48 truncate font-semibold text-slate-600" aria-current="page">{item.home ? <><Home className="mr-1 inline h-3.5 w-3.5" aria-hidden="true"/>{item.label}</> : item.label}</span> : <Link href={item.href} className="max-w-44 truncate font-medium text-slate-400 transition hover:text-[var(--theme-link)]">{item.home ? <Home className="h-3.5 w-3.5" aria-label={item.label}/> : item.label}</Link>}
    </span>)}
  </nav>;
}
