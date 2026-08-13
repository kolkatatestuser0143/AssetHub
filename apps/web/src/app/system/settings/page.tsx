const settings = [
  ['General', 'Platform name, branding and global defaults.'],
  ['Security', 'Authentication, session and privileged-access policies.'],
  ['Email & notifications', 'Platform email delivery and operational notifications.'],
  ['Domains', 'Platform hostnames, tenant domains and routing controls.'],
  ['Feature flags', 'Controlled rollout of platform capabilities.'],
  ['Maintenance', 'Maintenance windows and service messaging.'],
];

export default function SystemSettingsPage() {
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Configuration</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Platform settings</h2><p className="mt-2 text-sm text-slate-500">Global AssetHub controls for system administrators.</p></div><div className="grid gap-4 md:grid-cols-2">{settings.map(([name, description]) => <button key={name} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"><h3 className="font-semibold text-slate-950">{name}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p><span className="mt-4 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Backend configuration endpoint pending</span></button>)}</div></div>;
}
