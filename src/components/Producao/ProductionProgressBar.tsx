'use client';

interface ProductionProgressBarProps {
  receitasOP: number;
  receitasMassa: number;
  receitasFermentacao?: number;
}

// Formatar número de receitas: se for inteiro, mostrar sem decimais; senão, mostrar com 1 casa decimal
function formatarReceita(valor: number): string {
  const parteDecimal = Math.abs(valor % 1);
  if (parteDecimal < 0.001) {
    return Math.round(valor).toString();
  }
  return valor.toFixed(1);
}

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

  return (
    <div className="space-y-3">
      {/* Barra de progresso principal (massa) */}
      <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${percentualMassaLimitado}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-700 z-10">
            {formatarReceita(receitasMassa)} / {formatarReceita(receitasOP)} receitas
          </span>
        </div>
      </div>

      {/* Barra de progresso secundária (fermentação) */}
      {receitasFermentacao > 0 && (
        <div className="relative h-4 bg-gray-50 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-300 ease-out"
            style={{ width: `${percentualFermentacaoLimitado}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600 z-10">
              Fermentação: {percentualFermentacaoLimitado.toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

