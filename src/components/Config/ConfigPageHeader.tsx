'use client';

import type { ReactNode } from 'react';

type ConfigPageHeaderProps = {
  title: string;
  description?: string;
  icon: string;
  action?: ReactNode;
};

export default function ConfigPageHeader({
  title,
  description,
  icon,
  action,
}: ConfigPageHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-800"
            aria-hidden="true"
          >
            <span className="material-icons text-xl">{icon}</span>
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-stone-600">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
