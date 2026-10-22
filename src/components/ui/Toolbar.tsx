import type { CSSProperties, ReactNode } from 'react';

export interface ToolbarProps {
  title: ReactNode;
  resumo?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
  sticky?: boolean;
  flush?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function Toolbar({
  title,
  resumo,
  actions,
  filters,
  sticky = true,
  flush = false,
  style,
  className = '',
}: ToolbarProps) {
  return (
    <header
      style={style}
      className={[
        'border-b border-border-default py-4',
        flush ? 'px-0' : 'px-4 sm:px-6',
        sticky ? 'sticky top-0 z-20' : 'static',
        'bg-app/95 backdrop-blur-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.015em] text-text-strong">
            {title}
          </h1>
          {(filters || resumo) ? (
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              {filters}
              {resumo ? (
                <span className="min-w-0 font-mono text-sm tabular-nums tracking-[-0.004em] text-text-muted">
                  {resumo}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
