import type { CSSProperties, ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  style?: CSSProperties;
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  return (
    <div
      style={style}
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
    >
      <span
        className="material-icons mb-3 text-5xl text-stone-300"
        aria-hidden="true"
      >
        {icon}
      </span>
      {title ? (
        <p className="m-0 text-base font-semibold tracking-[-0.004em] text-text-strong">
          {title}
        </p>
      ) : null}
      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
