'use client';

import type { ReactNode } from 'react';
import { EmptyState, LoadingState } from '../ui';

export type DataColumn<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export function DataTable<T extends { id?: string }>({
  rows,
  columns,
  loading = false,
  emptyTitle = 'Nothing to show',
  emptyText = 'There are no records to display yet.',
  emptyAction,
  emptyActionLabel,
  minWidth = '720px',
  getRowKey,
}: {
  rows: T[];
  columns: DataColumn<T>[];
  loading?: boolean;
  emptyTitle?: string;
  emptyText?: string;
  emptyAction?: () => void;
  emptyActionLabel?: string;
  minWidth?: string;
  getRowKey?: (row: T, index: number) => string;
}) {
  if (loading) return <LoadingState />;
  if (!rows.length) return <EmptyState title={emptyTitle} text={emptyText} action={emptyActionLabel ? emptyAction : undefined} actionLabel={emptyActionLabel} />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>{columns.map(column => <th key={column.key} className={`px-5 py-3 font-semibold ${column.headerClassName ?? ''}`}>{column.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => <tr key={getRowKey?.(row, index) ?? row.id ?? String(index)} className="ui-table-row hover:bg-[var(--theme-primary-soft)]/40">{columns.map(column => <td key={column.key} className={`px-5 py-4 ${column.className ?? ''}`}>{column.render(row)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
