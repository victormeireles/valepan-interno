import Link from "next/link";
import { STAGES_CONFIG } from "@/config/stages";

// Mapeamento de cores e ícones para cada etapa (mesmo padrão do GenericStageForm)
const getStageColors = (stage: string) => {
  const colorMap: Record<string, { bg: string; iconBg: string; iconColor: string; icon: string }> = {
    
    
    // Etapas de produção - cores neutras
    'pre-mistura': { bg: 'bg-slate-800', iconBg: 'bg-slate-700', iconColor: 'text-slate-200', icon: '🥣' },
    'massa': { bg: 'bg-slate-800', iconBg: 'bg-slate-700', iconColor: 'text-slate-200', icon: '🥖' },
  };
  
  return colorMap[stage] || { bg: 'bg-gray-800', iconBg: 'bg-gray-700', iconColor: 'text-gray-200', icon: '📋' };
};

export default function Home() {
  return (
    <div className="bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Sistema de Produção
          </h1>
          <p className="text-lg text-gray-600">
            Registro de produção por etapas - Mobile First
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(STAGES_CONFIG).map(([stageKey, config]) => {
            const href = stageKey === 'producao-embalagem' ? '/realizado/embalagem' : `/${stageKey}`;
            const colors = getStageColors(stageKey);
            
            return (
              <Link
                key={stageKey}
                href={href}
                className={`block ${colors.bg} rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 text-white hover:scale-105`}
              >
                <div className="text-center">
                  <div className={`w-16 h-16 ${colors.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <span className={`${colors.iconColor} text-3xl`}>
                      {colors.icon}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    {config.name}
                  </h2>
                  <p className="text-gray-300 text-sm">
                    {config.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Seção de Meta de Produção */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            📋 Meta de Produção
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Link
              href="/meta/producao"
              className="block bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 text-white hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-slate-200 text-3xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Meta: Produção
                </h3>
                <p className="text-gray-300 text-sm">
                  Define metas para Fermentação e Forno
                </p>
              </div>
            </Link>
            <Link
              href="/meta/embalagem"
              className="block bg-blue-900 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 text-white hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-200 text-3xl">📦</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Meta: Embalagem
                </h3>
                <p className="text-gray-300 text-sm">
                  Define metas de embalagem por cliente e produto
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Seção de Produção Realizada */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            ✅ Produção Realizada
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Link
              href="/realizado/fermentacao"
              className="block bg-yellow-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 text-white hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-yellow-200 text-3xl">🍞</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Realizado: Fermentação
                </h3>
                <p className="text-gray-300 text-sm">
                  Registro de produção da fermentação
                </p>
              </div>
            </Link>
            <Link
              href="/realizado/resfriamento"
              className="block bg-blue-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 text-white hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-200 text-3xl">❄️</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Realizado: Resfriamento
                </h3>
                <p className="text-gray-300 text-sm">
                  Registro de produção do resfriamento
                </p>
              </div>
            </Link>
            <Link
              href="/realizado/forno"
              className="block bg-red-900 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 text-white hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-red-200 text-3xl">🔥</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Realizado: Forno
                </h3>
                <p className="text-gray-300 text-sm">
                  Registro de produção do forno
                </p>
              </div>
            </Link>
            <Link
              href="/realizado/embalagem"
              className="block bg-blue-900 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 text-white hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-200 text-3xl">📦</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Realizado: Embalagem
                </h3>
                <p className="text-gray-300 text-sm">
                  Registro de produção da embalagem
                </p>
              </div>
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Selecione uma etapa para registrar a produção ou defina as metas de produção
          </p>
        </div>
      </div>
    </div>
  );
}
