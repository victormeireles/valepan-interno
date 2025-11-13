'use client';

interface InventarioHeaderProps {
  title: string;
  subtitle?: string;
}

export function InventarioHeader({ title, subtitle }: InventarioHeaderProps) {
  const handleToggleMenu = () => {
    const event = new CustomEvent('toggle-menu');
    window.dispatchEvent(event);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-xs uppercase tracking-widest text-gray-500">
              {subtitle}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleToggleMenu}
          aria-label="Abrir menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex h-5 w-6 flex-col justify-between">
            <span className="block h-0.5 w-full rounded-full bg-current" />
            <span className="block h-0.5 w-full rounded-full bg-current" />
            <span className="block h-0.5 w-full rounded-full bg-current" />
          </div>
        </button>
      </div>
    </header>
  );
}

