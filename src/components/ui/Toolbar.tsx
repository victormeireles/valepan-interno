import type { CSSProperties, ReactNode } from 'react';

export interface ToolbarProps {
  title: ReactNode;
  resumo?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
  sticky?: boolean;
  style?: CSSProperties;
}

export function Toolbar({
  title,
  resumo,
  actions,
  filters,
  sticky = true,
  style,
}: ToolbarProps) {
  return (
    <header
      style={style}
      className={[
        'border-b border-border-default px-4 py-4 sm:px-6',
        sticky ? 'sticky top-0 z-20' : 'static',
        'bg-app/95 backdrop-blur-sm',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.015em] text-text-strong">
            {title}
          </h1>
          {(filters || resumo) ? (
            <div className="flex flex-wrap items-center gap-3">
              {filters}
              {resumo ? (
                <span className="font-mono text-sm tabular-nums tracking-[-0.004em] text-text-muted">
                  {resumo}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
