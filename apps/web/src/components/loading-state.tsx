'use client';

import { Loader2 } from 'lucide-react';

export type LoadingStateProps = {
  label?: string;
  description?: string;
  fullPage?: boolean;
  compact?: boolean;
};

export function LoadingState({
  label = 'Loading',
  description = 'Preparing this workspace…',
  fullPage = false,
  compact = false,
}: LoadingStateProps) {
  const content = (
    <div className={`ui-loading-state${compact ? ' ui-loading-state-compact' : ''}`} role="status" aria-live="polite" aria-label={label}>
      <div className="ui-loading-spinner" aria-hidden="true">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <div className="min-w-0">
        <p className="ui-loading-label">{label}</p>
        {!compact && description ? <p className="ui-loading-description">{description}</p> : null}
      </div>
    </div>
  );

  return fullPage ? <div className="ui-loading-page">{content}</div> : content;
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="ui-loading-skeleton" role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="ui-loading-skeleton-row">
          <span className="ui-loading-skeleton-avatar" />
          <span className="ui-loading-skeleton-lines">
            <span />
            <span />
          </span>
        </div>
      ))}
    </div>
  );
}
