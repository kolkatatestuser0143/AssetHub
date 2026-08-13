'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Bell, Building2, Boxes, ClipboardList, FileKey2, LayoutDashboard, Laptop, LogOut, Menu, Settings, ShieldCheck, Users, X, ListChecks, SlidersHorizontal, Truck, BarChart3, UserCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

const NAV = [
  ['/dashboard','Dashboard',LayoutDashboard],
  ['/assets','Assets',Laptop],
  ['/asset-types','Asset types',Boxes],
  ['/companies','Companies & structure',Building2],
  ['/assignments','Assignments',ListChecks],
  ['/vendors','Vendors',Truck],
  ['/custom-fields','Custom fields',SlidersHorizontal],
  ['/roles','Roles & permissions',ShieldCheck],
  ['/identity','Identity & SSO',FileKey2],
  ['/audit','Audit log',ClipboardList],
  ['/reports','Reports',BarChart3],
  ['/users','Users',Users],
] as const;

export default function ProtectedLayout({children}:{children:React.ReactNode}) {
  const {status,logout}=useAuth(); const pathname=usePathname(); const [open,setOpen]=useState(false);
  if(status==='loading') return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Loading AssetHub…</div>;
  if(status==='unauthenticated'){if(typeof window!=='undefined') window.location.href='/login';return null;}
  const sidebar=<aside className="flex h-full flex-col bg-slate-950 text-slate-300"><div className="flex h-16 items-center gap-3 border-b border-white/10 px-5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 font-bold text-white">A</div><div><div className="font-semibold text-white">AssetHub</div><div className="text-[10px] uppercase tracking-widest text-slate-500">ITAM Platform</div></div></div><nav className="flex-1 overflow-y-auto px-3 py-5"><p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Workspace</p>{NAV.map(([href,label,Icon])=>{const active=pathname===href||pathname.startsWith(href+'/');return <Link key={href} href={href} onClick={()=>setOpen(false)} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active?'bg-blue-600 text-white shadow-sm':'hover:bg-white/5 hover:text-white'}`}><Icon size={18}/>{label}</Link>})}</nav><div className="border-t border-white/10 p-3"><Link href="/profile" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/5 hover:text-white"><UserCircle size={18}/>Profile</Link><Link href="/settings" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/5 hover:text-white"><Settings size={18}/>Settings</Link><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/5 hover:text-white"><LogOut size={18}/>Sign out</button></div></aside>;
  return <div className="min-h-screen bg-slate-50"><div className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</div>{open&&<div className="fixed inset-0 z-50 bg-slate-950/60 lg:hidden"><div className="h-full w-72">{sidebar}</div></div>}<div className="lg:pl-64"><header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6"><button className="rounded-lg p-2 lg:hidden" onClick={()=>setOpen(true)}>{open?<X size={20}/>:<Menu size={20}/>}</button><div className="ml-auto flex items-center gap-2"><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Bell size={19}/></button><div className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">DA</span><div className="hidden sm:block"><div className="text-xs font-semibold">Demo Admin</div><div className="text-[11px] text-slate-500">Tenant Admin</div></div></div></div></header><main className="p-4 sm:p-6 lg:p-8">{children}</main></div></div>;
}
