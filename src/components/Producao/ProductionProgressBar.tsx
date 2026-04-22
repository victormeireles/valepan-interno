'use client';

import { formatReceitasBatidasDisplay } from '@/lib/utils/number-utils';

interface ProductionProgressBarProps {
  receitasOP: number;
  receitasMassa: number;
  receitasFermentacao?: number;
}

function formatarReceita(valor: number): string {
  const parteDecimal = Math.abs(valor % 1);
  if (parteDecimal < 0.001) {
    return Math.round(valor).toLocaleString('pt-BR');
  }
  return formatReceitasBatidasDisplay(valor);
}

const EPS = 1e-9;

export default function ProductionProgressBar({
  receitasOP,
  receitasMassa,
  receitasFermentacao = 0,
}: ProductionProgressBarProps) {
  // Calcular percentuais
  const percentualMassa = receitasOP > 0 ? (receitasMassa / receitasOP) * 100 : 0;
  const percentualFermentacao = receitasOP > 0 ? (receitasFermentacao / receitasOP) * 100 : 0;

  // Limitar percentuais a 100%
  const percentualMassaLimitado = Math.min(100, percentualMassa);
  const percentualFermentacaoLimitado = Math.min(100, percentualFermentacao);

  const massaPronta =
    receitasOP > 0 && receitasMassa + EPS >= receitasOP;

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Barra de progresso principal (massa): cor do preenchimento muda quando a meta é atingida */}
      <div className="relative h-5 overflow-hidden rounded-full bg-gray-100 sm:h-6">
        <div
          className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${
            massaPronta ? 'bg-emerald-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentualMassaLimitado}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center px-1">
          <span className="z-10 max-w-[calc(100%-0.5rem)] truncate rounded-full bg-white/95 px-1.5 py-px text-center text-[10px] font-semibold text-slate-900 shadow-sm ring-1 ring-slate-900/10 sm:px-2 sm:py-0.5 sm:text-xs">
            {formatarReceita(receitasMassa)} / {formatarReceita(receitasOP)} receitas
          </span>
        </div>
      </div>

      {/* Barra de progresso secundária (fermentação) */}
      {receitasFermentacao > 0 && (
        <div className="relative h-4 overflow-hidden rounded-full bg-gray-50 sm:h-5">
          <div
            className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-300 ease-out"
            style={{ width: `${percentualFermentacaoLimitado}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center px-1">
            <span className="z-10 max-w-[calc(100%-0.5rem)] truncate rounded-full bg-white/95 px-1.5 py-px text-center text-[9px] font-semibold text-slate-900 shadow-sm ring-1 ring-slate-900/10 sm:px-2 sm:py-0.5 sm:text-[10px] md:text-xs">
              Fermentação: {percentualFermentacaoLimitado.toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

