'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CONFIG_SECTIONS } from '@/config/config-sections';

export default function ConfigNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Seções de configuração" className="mb-6 lg:mb-0 lg:w-52 shrink-0">
      <Link
        href="/config"
        className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span className="material-icons text-base">arrow_back</span>
        Todas as configurações
      </Link>

      <p className="hidden lg:block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 px-1">
        Seções
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden snap-x">
        {CONFIG_SECTIONS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="material-icons text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="hidden lg:flex lg:flex-col lg:gap-1">
        {CONFIG_SECTIONS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                active
                  ? 'border-l-2 border-slate-900 bg-gray-50 font-semibold text-gray-900 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="material-icons text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
