'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  const visible: (number | 'ellipsis')[] = [];
  pages.forEach((p, i) => { if (i > 0 && p - pages[i - 1] > 1) visible.push('ellipsis'); visible.push(p); });
  return <nav className="ui-pagination" aria-label="Pagination">
    <button type="button" className="ui-page-btn" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16}/></button>
    {visible.map((item, i) => item === 'ellipsis' ? <span key={`e-${i}`} className="ui-page-ellipsis">…</span> : <button key={item} type="button" className={`ui-page-btn ${item === page ? 'is-active' : ''}`} aria-current={item === page ? 'page' : undefined} onClick={() => onChange(item)}>{item}</button>)}
    <button type="button" className="ui-page-btn" aria-label="Next page" disabled={page >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={16}/></button>
  </nav>;
}
