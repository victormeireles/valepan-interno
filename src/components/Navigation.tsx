'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { STAGES_CONFIG } from '@/config/stages';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Header com botão hambúrguer */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Título */}
            <div className="flex items-center">
              <Link 
                href="/" 
                className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
                onClick={closeMenu}
              >
                Valepan
              </Link>
            </div>

            {/* Botão hambúrguer */}
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Abrir menu"
            >
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <span 
                  className={`block h-0.5 w-6 bg-current transition-all duration-300 ${
                    isOpen ? 'rotate-45 translate-y-1.5' : ''
                  }`}
                />
                <span 
                  className={`block h-0.5 w-6 bg-current transition-all duration-300 ${
                    isOpen ? 'opacity-0' : ''
                  }`}
                />
                <span 
                  className={`block h-0.5 w-6 bg-current transition-all duration-300 ${
                    isOpen ? '-rotate-45 -translate-y-1.5' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Overlay para fechar o menu */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Menu lateral */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Cabeçalho do menu */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={closeMenu}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Fechar menu"
            >
              <span className="material-icons text-xl">close</span>
            </button>
          </div>

          {/* Navegação principal */}
          <nav className="flex-1 overflow-y-auto py-6">
            <div className="px-6 space-y-2">
              {/* Página inicial */}
              <Link
                href="/"
                onClick={closeMenu}
                className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="material-icons text-xl mr-3">home</span>
                Página Inicial
              </Link>

              {/* Separador */}
              <div className="my-4 border-t border-gray-200" />

              {/* Etapas de produção */}
              <div className="space-y-1">
                <h3 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Etapas de Produção
                </h3>
                {Object.entries(STAGES_CONFIG).map(([stageKey, config]) => {
                  const href = stageKey === 'producao-embalagem' ? '/realizado/embalagem' : `/${stageKey}`;
                  
                  return (
                    <Link
                      key={stageKey}
                      href={href}
                      onClick={closeMenu}
                      className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        isActive(href) 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {getStageNumber(stageKey)}
                      </span>
                      {config.name}
                    </Link>
                  );
                })}
              </div>

              {/* Separador */}
              <div className="my-4 border-t border-gray-200" />

              {/* Meta de Produção */}
              <div className="space-y-1">
                <h3 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  📋 Meta de Produção
                </h3>
                <Link
                  href="/meta/producao"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive('/meta/producao')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">assignment</span>
                  Meta: Produção
                </Link>
                <Link
                  href="/meta/embalagem"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive('/meta/embalagem')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">inventory</span>
                  Meta: Embalagem
                </Link>
              </div>

              {/* Separador */}
              <div className="my-4 border-t border-gray-200" />

              {/* Produção Realizada */}
              <div className="space-y-1">
                <h3 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  ✅ Produção Realizada
                </h3>
                <Link
                  href="/realizado/fermentacao"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive('/realizado/fermentacao')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">eco</span>
                  Realizado: Fermentação
                </Link>
                <Link
                  href="/realizado/forno"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive('/realizado/forno')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">local_fire_department</span>
                  Realizado: Forno
                </Link>
                <Link
                  href="/realizado/embalagem"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive('/realizado/embalagem')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">inventory_2</span>
                  Realizado: Embalagem
                </Link>
              </div>
            </div>
          </nav>

          {/* Rodapé do menu */}
          <div className="p-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Sistema de Produção
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Mobile First
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function getStageNumber(stageKey: string): string {
  const numbers: Record<string, string> = {
    'pre-mistura': '1',
    'massa': '2',
    'fermentacao': '3',
    'resfriamento': '4',
    'forno': '5',
    'producao-embalagem': '6',
  };
  
  return numbers[stageKey] || '?';
}
