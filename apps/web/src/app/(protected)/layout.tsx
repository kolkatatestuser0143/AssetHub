'use client';

import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/assets', label: 'Assets' },
  { href: '/companies', label: 'Companies' },
  { href: '/roles', label: 'Roles' },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { status, logout } = useAuth();

  if (status === 'loading') {
    return <main style={{ padding: 40 }}>Loading…</main>;
  }

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, borderRight: '1px solid #e5e5e5', padding: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 24 }}>ITAM</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} style={{ marginTop: 32, padding: 8, width: '100%' }}>
          Log out
        </button>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}