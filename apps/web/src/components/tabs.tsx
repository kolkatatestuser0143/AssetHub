'use client';

import { ReactNode } from 'react';

type Tab = { id: string; label: string; icon?: ReactNode; disabled?: boolean };

export function Tabs({ tabs, value, onChange, className = '' }: { tabs: Tab[]; value: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div role="tablist" className={`ui-tabs ${className}`}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button key={tab.id} type="button" role="tab" aria-selected={active} disabled={tab.disabled} onClick={() => onChange(tab.id)} className={`ui-tab ${active ? 'is-active' : ''}`}>
            {tab.icon}<span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
