import type { ReactNode } from 'react';

export function ColunaRotulo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex min-w-0 max-w-full flex-col items-start gap-0.5 leading-tight">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 md:sr-only">{label}</span>
      <span className="max-w-full truncate">{children}</span>
    </span>
  );
}
