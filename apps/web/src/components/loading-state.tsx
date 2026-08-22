'use client';

export type LoadingSkeletonProps = {
  rows?: number;
  fullPage?: boolean;
  label?: string;
  className?: string;
};

export function LoadingSkeleton({
  rows = 5,
  fullPage = false,
  label = 'Loading content',
  className = '',
}: LoadingSkeletonProps) {
  const content = (
    <div className={`ui-loading-skeleton ${className}`.trim()} role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="ui-loading-skeleton-row">
          <span className="ui-loading-skeleton-avatar" aria-hidden="true" />
          <span className="ui-loading-skeleton-lines" aria-hidden="true">
            <span />
            <span />
          </span>
        </div>
      ))}
    </div>
  );

  return fullPage ? <div className="ui-loading-skeleton-page">{content}</div> : content;
}
