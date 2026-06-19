import type { ReactNode } from 'react';

interface HubSectionProps {
  title: string;
  children: ReactNode;
}

export function HubSection({ title, children }: HubSectionProps) {
  return (
    <section className="mb-10 last:mb-0">
      <div className="mb-5 flex items-center gap-3.5">
        <h2 className="shrink-0 text-xl font-bold tracking-tight text-text-strong">
          {title}
        </h2>
        <span className="h-px flex-1 bg-border-default" aria-hidden="true" />
      </div>
      {children}
    </section>
  );
}
