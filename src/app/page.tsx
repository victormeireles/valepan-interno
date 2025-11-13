import Link from "next/link";

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

        {/* Seção de Meta de Produção */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            📋 Meta de Produção
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
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
            <Link
              href="/meta/saidas"
              className="block bg-purple-900 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 text-white hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-purple-200 text-3xl">📤</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Meta: Saídas
                </h3>
                <p className="text-gray-300 text-sm">
                  Define metas de saídas por cliente e produto
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
            {/* Temporariamente removido
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
            */}
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
            <Link
              href="/realizado/saidas"
              className="block bg-purple-900 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 text-white hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-purple-200 text-3xl">📤</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Realizado: Saídas
                </h3>
                <p className="text-gray-300 text-sm">
                  Controle de saídas com meta e foto
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Seção de Inventário */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            📦 Inventário
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Link
              href="/realizado/estoque"
              className="block bg-emerald-900 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 text-white hover:scale-105"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-emerald-200 text-3xl">🏷️</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Inventário de Estoque
                </h3>
                <p className="text-gray-300 text-sm">
                  Atualize o estoque físico e registre diferenças
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
