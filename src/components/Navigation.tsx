'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  currentFilaStation,
  filaUrlForProductionStep,
  filaUrlForStation,
  parseFilaDataQuery,
} from '@/lib/production/production-station-routes';

interface NavigationProps {
  hideHeader?: boolean;
}

export default function Navigation({ hideHeader = false }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  /** Na fila, `/producao/fila` sem query usa estação planejamento (igual a `page.tsx`). */
  const filaStation = currentFilaStation(searchParams);
  const filaDataPreserve = parseFilaDataQuery(searchParams.get('data'));
  const filaOpts = filaDataPreserve ? { data: filaDataPreserve } : undefined;
  const isFilaPlanejamentoActive =
    pathname?.startsWith('/producao/fila') && filaStation === 'planejamento';

  // Listener para evento de toggle vindo de RealizadoHeader
  useEffect(() => {
    const handleToggleMenu = () => {
      setIsOpen(prev => !prev);
    };

    window.addEventListener('toggle-menu', handleToggleMenu);
    return () => {
      window.removeEventListener('toggle-menu', handleToggleMenu);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const closeIfMobile = () => {
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      }
    };
    closeIfMobile();
    window.addEventListener('resize', closeIfMobile);
    return () => window.removeEventListener('resize', closeIfMobile);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  }, [pathname]);

  const isActive = (path: string) => pathname === path;

  const baseClasses =
    'fixed top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-all duration-300 ease-in-out z-50';
  const drawerState = isOpen
    ? 'translate-x-0 opacity-100 pointer-events-auto'
    : 'translate-x-full opacity-0 pointer-events-none';
  const menuClasses = `${baseClasses} ${drawerState}`;

  return (
    <>
      {/* Header com botão hambúrguer */}
      {!hideHeader && (
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
      )}

      {/* Overlay para fechar o menu - apenas em mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Menu lateral */}
      {isOpen && (
        <div
          className={`${menuClasses}`}
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
                {/* Temporariamente removido
                <Link
                  href="/realizado/resfriamento"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive('/realizado/resfriamento')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">ac_unit</span>
                  Realizado: Resfriamento
                </Link>
                */}
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
                <Link
                  href="/realizado/saidas"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive('/realizado/saidas')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">assignment_turned_in</span>
                  Realizado: Saídas
                </Link>
              </div>

              {/* Separador */}
              <div className="my-4 border-t border-gray-200" />

              {/* Inventário */}
              <div className="space-y-1">
                <h3 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  📦 Inventário
                </h3>
                <Link
                  href="/realizado/estoque"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive('/realizado/estoque')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">inventory</span>
                  Inventário de Estoque
                </Link>
                <Link
                  href="/painel/dashboard-estoque"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive('/painel/dashboard-estoque')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">dashboard</span>
                  Estoque
                </Link>
              </div>

              {/* Separador */}
              <div className="my-4 border-t border-gray-200" />

              {/* Cadastros */}
              <div className="space-y-1">
                <h3 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  ⚙️ Cadastros
                </h3>
                <Link
                  href="/insumos"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive('/insumos')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">inventory</span>
                  Insumos
                </Link>
                <Link
                  href="/receitas"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive('/receitas')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">menu_book</span>
                  Receitas
                </Link>
                <Link
                  href="/produtos/receitas"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive('/produtos/receitas')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">category</span>
                  Receitas x Produto
                </Link>
                <Link
                  href="/produtos/latas"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    pathname?.startsWith('/produtos/latas')
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">bakery_dining</span>
                  Latas
                </Link>
                <Link
                  href="/carrinhos"
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    pathname === '/carrinhos'
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">shopping_cart</span>
                  Carrinhos
                </Link>
              </div>

              {/* Separador */}
              <div className="my-4 border-t border-gray-200" />

              {/* Fila de Produção */}
              <div className="space-y-1">
                <h3 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  🏭 Fila de Produção
                </h3>
                <Link
                  href={filaUrlForStation('planejamento', filaOpts)}
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isFilaPlanejamentoActive
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">schedule</span>
                  Planejamento
                </Link>
                <Link
                  href={filaUrlForProductionStep('massa', filaOpts)}
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    pathname?.startsWith('/producao/fila') && filaStation === 'massa'
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">blender</span>
                  Massa
                </Link>
                <Link
                  href={filaUrlForProductionStep('fermentacao', filaOpts)}
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    pathname?.startsWith('/producao/fila') && filaStation === 'fermentacao'
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">eco</span>
                  Fermentação
                </Link>
                <Link
                  href={filaUrlForProductionStep('entrada_forno', filaOpts)}
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    pathname?.startsWith('/producao/fila') && filaStation === 'entrada_forno'
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">local_fire_department</span>
                  Entrada do Forno
                </Link>
                <Link
                  href={filaUrlForProductionStep('saida_forno', filaOpts)}
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    pathname?.startsWith('/producao/fila') && filaStation === 'saida_forno'
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">outbox</span>
                  Saída do Forno
                </Link>
                <Link
                  href={filaUrlForProductionStep('entrada_embalagem', filaOpts)}
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    pathname?.startsWith('/producao/fila') && filaStation === 'entrada_embalagem'
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">inventory_2</span>
                  Entrada da Embalagem
                </Link>
                <Link
                  href={filaUrlForProductionStep('saida_embalagem', filaOpts)}
                  onClick={closeMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    pathname?.startsWith('/producao/fila') && filaStation === 'saida_embalagem'
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="material-icons text-xl mr-3">local_shipping</span>
                  Saída da Embalagem
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
      )}
    </>
  );
}

