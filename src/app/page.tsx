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
          {Object.entries(STAGES_CONFIG).map(([stageKey, config]) => (
            <Link
              key={stageKey}
              href={`/${stageKey}`}
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
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Selecione uma etapa para registrar a produção
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
  };
  
  return numbers[stageKey] || '?';
}