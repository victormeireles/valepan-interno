import Link from 'next/link';
import { CONFIG_SECTIONS } from '@/config/config-sections';

export default function ConfigHub() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-gray-600">
          Ajustes do sistema, cadastros auxiliares e integrações.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CONFIG_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex min-h-[4.5rem] items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-gray-700 transition-colors group-hover:bg-white"
              aria-hidden="true"
            >
              <span className="material-icons text-xl">{section.icon}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-gray-900 group-hover:text-slate-800">
                {section.label}
              </span>
              <span className="mt-0.5 block text-sm text-gray-600 leading-snug">
                {section.description}
              </span>
            </span>
            <span
              className="material-icons shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-600"
              aria-hidden="true"
            >
              chevron_right
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
