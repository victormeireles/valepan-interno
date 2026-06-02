'use client';

import Image from 'next/image';
import { useState } from 'react';
import CalendarDateFilter from '@/components/FormControls/CalendarDateFilter';

interface RealizadoHeaderProps {
  title: string;
  icon: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function RealizadoHeader({
  title,
  icon,
  selectedDate,
  onDateChange,
}: RealizadoHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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
            <span className="text-2xl">{icon}</span>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {title}
            </h1>
          </div>

          {/* Filtro de Data e Menu */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label 
                htmlFor="date-filter" 
                className="text-gray-700 text-sm font-medium whitespace-nowrap"
              >
                Data:
              </label>
              <div className="min-w-[11rem] max-w-[16rem]">
                <CalendarDateFilter
                  id="date-filter"
                  value={selectedDate}
                  onChange={(d) => {
                    if (d !== null) onDateChange(d);
                  }}
                  label="Data do painel"
                  wrapperClassName="inline-flex min-h-10 w-full items-center gap-2"
                  nativePickerClassName="min-h-10 min-w-0 flex-1 cursor-pointer rounded-lg border-2 border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  todayButtonClassName="min-h-10 shrink-0 rounded-lg border border-gray-300 bg-gray-50 px-2.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            {/* Botão hambúrguer */}
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

