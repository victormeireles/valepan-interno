'use client';

import Image from 'next/image';

interface DashboardHeaderProps {
  title: string;
  icon: string;
}

export default function DashboardHeader({
  title,
  icon,
}: DashboardHeaderProps) {
  const toggleMenu = () => {
    // Disparar evento para o Navigation component
    const event = new CustomEvent('toggle-menu');
    window.dispatchEvent(event);
  };

  return (
    <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Image
              src="/logo-full-light.svg"
              alt="Valepan"
              width={120}
              height={40}
              priority
              className="h-8 w-auto"
            />
          </div>

          {/* Título */}
          <div className="flex items-center gap-2">
            {/* Renderizar como Material Icon se não for emoji, caso contrário renderizar como texto */}
            {icon.match(/[\u{1F300}-\u{1F9FF}]/u) ? (
              <span className="text-2xl">{icon}</span>
            ) : (
              <span className="material-icons text-2xl text-gray-700">{icon}</span>
            )}
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {title}
            </h1>
          </div>

          {/* Botão hambúrguer */}
          <div className="flex items-center">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Abrir menu"
            >
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <span className="block h-0.5 w-6 bg-current transition-all duration-300" />
                <span className="block h-0.5 w-6 bg-current transition-all duration-300" />
                <span className="block h-0.5 w-6 bg-current transition-all duration-300" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

