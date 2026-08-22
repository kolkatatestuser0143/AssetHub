'use client';

import { ReactNode } from 'react';

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="ui-tooltip-wrap"><span className="ui-tooltip-trigger">{children}</span><span role="tooltip" className="ui-tooltip">{label}</span></span>;
}
