import type { ReactNode } from 'react';

export function ColunaRotulo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-col items-start leading-tight">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 md:sr-only">{label}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}
