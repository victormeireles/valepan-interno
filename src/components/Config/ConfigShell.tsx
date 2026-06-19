'use client';

import { usePathname } from 'next/navigation';
import ConfigNav from '@/components/Config/ConfigNav';

export default function ConfigShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHub = pathname === '/config';

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] text-text-strong [color-scheme:light]">
      <div className={isHub ? undefined : 'lg:flex lg:items-start lg:gap-8'}>
        {!isHub && <ConfigNav />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
