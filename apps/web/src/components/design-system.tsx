export function PageHeader({ title, description }: { title: string; description?: string }) {
  return <div className="mb-7"><h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>{description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}</div>;
}
