'use client';

import Link from 'next/link';
import ConfigNav from '@/components/Config/ConfigNav';

function openGlobalMenu() {
  window.dispatchEvent(new CustomEvent('toggle-menu'));
}

export default function ConfigShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white text-gray-900 [color-scheme:light]">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className="shrink-0 text-base font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                Valepan
              </Link>
              <span className="hidden sm:inline text-gray-300" aria-hidden="true">
                /
              </span>
              <span className="hidden sm:inline truncate text-sm font-medium text-gray-600">
                Configurações
              </span>
            </div>
            <button
              type="button"
              onClick={openGlobalMenu}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Abrir menu principal"
            >
              <span className="material-icons">menu</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav
          aria-label="Breadcrumb"
          className="mb-4 hidden lg:flex items-center gap-2 text-sm text-gray-600"
        >
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Início
          </Link>
          <span aria-hidden="true">›</span>
          <span className="font-medium text-gray-900">Configurações</span>
        </nav>

        <div className="lg:flex lg:gap-8 lg:items-start">
          <ConfigNav />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
