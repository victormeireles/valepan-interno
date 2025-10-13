import Link from "next/link";
import { STAGES_CONFIG } from "@/config/stages";

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
            
            return (
              <Link
                key={stageKey}
                href={href}
                className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-blue-600 text-2xl font-bold">
                      {getStageNumber(stageKey)}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {config.name}
                  </h2>
                  <p className="text-gray-600 text-sm">
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
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-icons text-blue-600 text-2xl">assignment</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Meta: Produção
                </h3>
                <p className="text-gray-600 text-sm">
                  Define metas para Fermentação e Forno
                </p>
              </div>
            </Link>
            <Link
              href="/meta/embalagem"
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-icons text-green-600 text-2xl">inventory</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Meta: Embalagem
                </h3>
                <p className="text-gray-600 text-sm">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Link
              href="/realizado/fermentacao"
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-icons text-purple-600 text-2xl">eco</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Realizado: Fermentação
                </h3>
                <p className="text-gray-600 text-sm">
                  Registro de produção da fermentação
                </p>
              </div>
            </Link>
            <Link
              href="/realizado/forno"
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-icons text-orange-600 text-2xl">local_fire_department</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Realizado: Forno
                </h3>
                <p className="text-gray-600 text-sm">
                  Registro de produção do forno
                </p>
              </div>
            </Link>
            <Link
              href="/realizado/embalagem"
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-icons text-teal-600 text-2xl">inventory_2</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Realizado: Embalagem
                </h3>
                <p className="text-gray-600 text-sm">
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