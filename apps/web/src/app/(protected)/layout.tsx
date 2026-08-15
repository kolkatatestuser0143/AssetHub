'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useEffect, useState } from 'react';
import { Bell, Building2, Boxes, ClipboardList, FileKey2, LayoutDashboard, Laptop, LogOut, Menu, Settings, ShieldCheck, Users, X, ListChecks, SlidersHorizontal, Truck, BarChart3, UserCircle, Printer } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import PageTransition from '../../components/layout/PageTransition';
import CommandPalette from '../../components/navigation/CommandPalette';

type NavItem = readonly [string, string, typeof LayoutDashboard, string?];

const NAV: readonly NavItem[] = [
  ['/dashboard','Dashboard',LayoutDashboard],
  ['/assets','Assets',Laptop],
  ['/assets/labels','Label printing',Printer],
  ['/asset-types','Asset types',Boxes],
  ['/companies','Companies & structure',Building2],
  ['/assignments','Assignments',ListChecks],
  ['/vendors','Vendors',Truck],
  ['/custom-fields','Custom fields',SlidersHorizontal,'custom_fields_enabled'],
  ['/roles','Roles & permissions',ShieldCheck,'custom_roles_enabled'],
  ['/identity','Identity & SSO',FileKey2,'sso_enabled'],
  ['/audit','Audit log',ClipboardList,'audit_enabled'],
  ['/reports','Reports',BarChart3],
  ['/users','Users',Users],
];

const ROUTE_FEATURES = [
  ['/custom-fields','custom_fields_enabled'],
  ['/roles','custom_roles_enabled'],
  ['/identity','sso_enabled'],
  ['/audit','audit_enabled'],
] as const;

export default function ProtectedLayout({children}:{children:React.ReactNode}) {
  const {status,logout,themePreset,hasFeature}=useAuth();
  const pathname=usePathname();
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const visibleNav = useMemo(() => NAV.filter(([, , , feature]) => !feature || hasFeature(feature)), [hasFeature]);
  const requiredFeature = ROUTE_FEATURES.find(([prefix]) => pathname===prefix || pathname.startsWith(`${prefix}/`))?.[1];

  useEffect(() => {
    if (status === 'authenticated' && requiredFeature && !hasFeature(requiredFeature)) router.replace('/dashboard');
  }, [status, requiredFeature, hasFeature, router]);

  if(status==='loading') return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Loading AssetHub…</div>;
  if(status==='unauthenticated'){if(typeof window!=='undefined') window.location.href='/login';return null;}
  if(requiredFeature && !hasFeature(requiredFeature)) return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Returning to Dashboard…</div>;

  const sidebar=<aside className="flex h-full flex-col text-slate-300" style={{background:'var(--theme-sidebar)',color:'var(--theme-sidebar-text)'}}><div className="flex h-16 items-center gap-3 border-b border-white/10 px-5"><div className="grid h-9 w-9 place-items-center rounded-xl font-bold text-white" style={{background:'var(--theme-primary)'}}>A</div><div><div className="font-semibold text-white">AssetHub</div><div className="text-[10px] uppercase tracking-widest opacity-60">ITAM Platform</div></div></div><nav className="flex-1 overflow-y-auto px-3 py-5"><p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest opacity-60">Workspace</p>{visibleNav.map(([href,label,Icon])=>{const active=pathname===href||pathname.startsWith(href+'/');return <Link key={href} href={href} prefetch onClick={()=>setOpen(false)} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active?'text-white shadow-sm':''}`} style={active?{background:'var(--theme-sidebar-active)'}:undefined}><Icon size={18}/>{label}</Link>})}</nav><div className="border-t border-white/10 p-3"><Link href="/profile" prefetch className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/5 hover:text-white"><UserCircle size={18}/>Profile</Link><Link href="/settings" prefetch className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/5 hover:text-white"><Settings size={18}/>Settings</Link><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/5 hover:text-white"><LogOut size={18}/>Sign out</button></div></aside>;
  return <div className="min-h-screen bg-slate-50"><div className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</div>{open&&<div className="fixed inset-0 z-50 bg-slate-950/60 lg:hidden"><div className="h-full w-72">{sidebar}</div></div>}<div className="lg:pl-64"><header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6"><button className="rounded-lg p-2 lg:hidden" onClick={()=>setOpen(true)} aria-label="Open navigation">{open?<X size={20}/>:<Menu size={20}/>}</button><div className="ml-auto flex items-center gap-2"><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications"><Bell size={19}/></button><div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5"><kbd className="rounded-md border bg-slate-50 px-1.5 py-1 text-[10px] text-slate-400">⌘K</kbd><span className="text-[11px] text-slate-500">Search</span></div><div className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5"><span className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold" style={{background:'var(--theme-primary-soft)',color:'var(--theme-link)'}}>A</span><div className="hidden md:block"><div className="text-xs font-semibold">Tenant account</div><div className="text-[11px] text-slate-500">{themePreset.replace(/_/g,' ')}</div></div></div></div></header><main className="p-4 sm:p-6 lg:p-8"><PageTransition>{children}</PageTransition></main></div><CommandPalette/></div>;
}
