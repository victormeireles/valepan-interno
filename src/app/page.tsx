import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-100/20 to-indigo-100/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-gradient-to-br from-emerald-100/20 to-teal-100/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-gradient-to-br from-yellow-100/20 to-amber-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="relative w-32 sm:w-40 md:w-44 transition-all duration-500 hover:scale-105">
              <Image
                src="/logo-full-light.svg"
                alt="Valepan"
                width={422}
                height={301}
                className="w-full h-auto drop-shadow-lg"
                priority
              />
            </div>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto font-light">
            Controle completo da produção em um só lugar
          </p>
        </div>

        {/* Seção de Meta de Produção */}
        <section className="mb-10 sm:mb-12 lg:mb-14">
          <div className="flex items-center gap-4 mb-8 sm:mb-10">
            <div className="h-0.5 w-16 sm:w-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-transparent"></div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              Meta de Produção
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <Link
              href="/meta/embalagem"
              className="group relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 p-8 sm:p-10 border border-gray-100/50 hover:border-blue-300/50 overflow-hidden transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-indigo-50/0 to-purple-50/0 group-hover:from-blue-50/50 group-hover:via-indigo-50/30 group-hover:to-purple-50/50 transition-all duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/0 to-purple-100/0 group-hover:from-blue-100/30 group-hover:to-purple-100/20 rounded-full blur-2xl transition-all duration-500 -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <span className="text-3xl sm:text-4xl">📦</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                  Meta: Embalagem
                </h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                  Define metas de embalagem por cliente e produto
                </p>
                <div className="flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                  <span className="text-sm font-semibold uppercase tracking-wider">Acessar</span>
                  <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Seção de Produção Realizada */}
        <section className="mb-10 sm:mb-12 lg:mb-14">
          <div className="flex items-center gap-4 mb-8 sm:mb-10">
            <div className="h-0.5 w-16 sm:w-20 bg-gradient-to-r from-emerald-600 via-teal-600 to-transparent"></div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              Produção Realizada
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Link
              href="/realizado/fermentacao"
              className="group relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 p-8 sm:p-10 border border-gray-100/50 hover:border-yellow-300/50 overflow-hidden transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/0 via-amber-50/0 to-orange-50/0 group-hover:from-yellow-50/50 group-hover:via-amber-50/30 group-hover:to-orange-50/50 transition-all duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-100/0 to-amber-100/0 group-hover:from-yellow-100/30 group-hover:to-amber-100/20 rounded-full blur-2xl transition-all duration-500 -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <span className="text-3xl sm:text-4xl">🍞</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-yellow-600 transition-colors duration-300">
                  Fermentação
                </h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                  Registro de produção da fermentação
                </p>
                <div className="flex items-center text-yellow-600 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                  <span className="text-sm font-semibold uppercase tracking-wider">Acessar</span>
                  <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link
              href="/realizado/forno"
              className="group relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 p-8 sm:p-10 border border-gray-100/50 hover:border-red-300/50 overflow-hidden transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/0 via-rose-50/0 to-pink-50/0 group-hover:from-red-50/50 group-hover:via-rose-50/30 group-hover:to-pink-50/50 transition-all duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-100/0 to-rose-100/0 group-hover:from-red-100/30 group-hover:to-rose-100/20 rounded-full blur-2xl transition-all duration-500 -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <span className="text-3xl sm:text-4xl">🔥</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors duration-300">
                  Forno
                </h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                  Registro de produção do forno
                </p>
                <div className="flex items-center text-red-600 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                  <span className="text-sm font-semibold uppercase tracking-wider">Acessar</span>
                  <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link
              href="/realizado/embalagem"
              className="group relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 p-8 sm:p-10 border border-gray-100/50 hover:border-blue-300/50 overflow-hidden transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-indigo-50/0 to-purple-50/0 group-hover:from-blue-50/50 group-hover:via-indigo-50/30 group-hover:to-purple-50/50 transition-all duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/0 to-indigo-100/0 group-hover:from-blue-100/30 group-hover:to-indigo-100/20 rounded-full blur-2xl transition-all duration-500 -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <span className="text-3xl sm:text-4xl">📦</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                  Embalagem
                </h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                  Registro de produção da embalagem
                </p>
                <div className="flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                  <span className="text-sm font-semibold uppercase tracking-wider">Acessar</span>
                  <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link
              href="/realizado/saidas"
              className="group relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 p-8 sm:p-10 border border-gray-100/50 hover:border-purple-300/50 overflow-hidden transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/0 via-pink-50/0 to-indigo-50/0 group-hover:from-purple-50/50 group-hover:via-pink-50/30 group-hover:to-indigo-50/50 transition-all duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-100/0 to-pink-100/0 group-hover:from-purple-100/30 group-hover:to-pink-100/20 rounded-full blur-2xl transition-all duration-500 -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <span className="text-3xl sm:text-4xl">📤</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors duration-300">
                  Saídas
                </h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                  Controle de saídas com meta e foto
                </p>
                <div className="flex items-center text-purple-600 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                  <span className="text-sm font-semibold uppercase tracking-wider">Acessar</span>
                  <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Seção de Estoque */}
        <section className="mb-8 sm:mb-10">
          <div className="flex items-center gap-4 mb-8 sm:mb-10">
            <div className="h-0.5 w-16 sm:w-20 bg-gradient-to-r from-teal-600 via-cyan-600 to-transparent"></div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              Estoque
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-xl">
            <Link
              href="/painel/dashboard-estoque"
              className="group relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 p-8 sm:p-10 border border-gray-100/50 hover:border-teal-300/50 overflow-hidden transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50/0 via-cyan-50/0 to-blue-50/0 group-hover:from-teal-50/50 group-hover:via-cyan-50/30 group-hover:to-blue-50/50 transition-all duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-100/0 to-cyan-100/0 group-hover:from-teal-100/30 group-hover:to-cyan-100/20 rounded-full blur-2xl transition-all duration-500 -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <span className="text-3xl sm:text-4xl">📊</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-teal-600 transition-colors duration-300">
                  Estoque
                </h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                  Visualize gráficos e relatórios de estoque
                </p>
                <div className="flex items-center text-teal-600 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                  <span className="text-sm font-semibold uppercase tracking-wider">Acessar</span>
                  <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Seção de Configurações */}
        <section className="mb-8 sm:mb-10">
          <div className="flex items-center gap-4 mb-8 sm:mb-10">
            <div className="h-0.5 w-16 sm:w-20 bg-gradient-to-r from-slate-600 via-gray-600 to-transparent"></div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              Configurações
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <Link
              href="/config/assadeiras"
              className="group relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 p-8 sm:p-10 border border-gray-100/50 hover:border-slate-300/50 overflow-hidden transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50/0 via-gray-50/0 to-slate-100/0 group-hover:from-slate-50/50 group-hover:via-gray-50/30 group-hover:to-slate-100/50 transition-all duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <span className="material-icons text-3xl sm:text-4xl text-white">bakery_dining</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-slate-700 transition-colors duration-300">
                  Assadeiras
                </h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                  Tipos de assadeira, capacidade e estoque
                </p>
                <div className="flex items-center text-slate-700 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                  <span className="text-sm font-semibold uppercase tracking-wider">Acessar</span>
                  <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link
              href="/config/whatsapp"
              className="group relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 p-8 sm:p-10 border border-gray-100/50 hover:border-emerald-300/50 overflow-hidden transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 via-teal-50/0 to-green-50/0 group-hover:from-emerald-50/50 group-hover:via-teal-50/30 group-hover:to-green-50/50 transition-all duration-500"></div>
              <div className="relative">
                <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-emerald-600 via-teal-600 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <span className="material-icons text-3xl sm:text-4xl text-white">chat</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors duration-300">
                  WhatsApp
                </h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                  Notificações de produção
                </p>
                <div className="flex items-center text-emerald-600 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                  <span className="text-sm font-semibold uppercase tracking-wider">Acessar</span>
                  <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-20 sm:mt-24 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative w-24 sm:w-28 h-auto opacity-40 hover:opacity-60 transition-opacity duration-300">
              <Image
                src="/logo-full-dark.png"
                alt="Valepan"
                width={422}
                height={301}
                className="w-full h-auto"
              />
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 font-light tracking-widest uppercase">
            Mobile First
          </p>
        </div>
      </div>
    </div>
  );
}
