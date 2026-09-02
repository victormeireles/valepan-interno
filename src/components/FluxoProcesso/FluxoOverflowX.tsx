'use client';

import type { ReactNode } from 'react';

type FluxoOverflowXProps = {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Scroll X contido — o trilho de 24h não estica a página no mobile.
 */
export default function FluxoOverflowX({
  label,
  hint = 'Deslize para ver as 24 horas',
  className = '',
  children,
}: FluxoOverflowXProps) {
  return (
    <div className={['min-w-0 min-h-0', className].filter(Boolean).join(' ')}>
      <div
        className="h-full min-h-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
        aria-label={label}
      >
        {children}
      </div>
      {hint ? (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-text-faint md:hidden">
          <span className="material-icons text-[14px]" aria-hidden>
            swipe
          </span>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
