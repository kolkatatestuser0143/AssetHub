'use client';

import { useMemo, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../../lib/auth-context';
import { FEATURE_ROUTES, type FeatureKey } from '../../lib/feature-registry';
import PageTransition from '../../components/layout/PageTransition';
import CommandPalette from '../../components/navigation/CommandPalette';
import AppShell from '../../components/app-shell';

function isRouteMatch(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getRequiredFeature(pathname: string): FeatureKey | undefined {
  const match = Object.entries(FEATURE_ROUTES)
    .filter(([prefix]) => isRouteMatch(pathname, prefix))
    .sort(([a], [b]) => b.length - a.length)[0];
  return match?.[1];
}

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { status, hasFeature, forcePasswordReset } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const requiredFeature = useMemo(() => getRequiredFeature(pathname), [pathname]);
  const passwordChangeRoute = pathname.endsWith('/change-password');

  useEffect(() => {
    if (status === 'authenticated' && forcePasswordReset && !passwordChangeRoute) {
      router.replace('/change-password');
    }
  }, [status, forcePasswordReset, passwordChangeRoute, router]);

  useEffect(() => {
    if (status === 'unauthenticated' && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, [status]);

  if (status === 'loading') {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Loading AssetHub…</div>;
  }

  if (status === 'unauthenticated') return null;

  if (passwordChangeRoute) {
    return <div className="min-h-screen bg-slate-50"><main className="min-h-screen"><PageTransition>{children}</PageTransition></main></div>;
  }

  if (forcePasswordReset) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Redirecting to password setup…</div>;
  }

  if (requiredFeature && !hasFeature(requiredFeature)) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">This feature is not included in your current license.</div>;
  }

  return (
    <>
      <AppShell><PageTransition>{children}</PageTransition></AppShell>
      <CommandPalette />
    </>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><ProtectedContent>{children}</ProtectedContent></AuthProvider>;
}
