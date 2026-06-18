'use client';

import type { ProdutoResumoComReceitas } from '@/app/actions/produto-receitas-actions';
import { PRODUTO_RECEITA_TIPO_LABELS } from '@/components/ProdutosConfig/produto-receita-tipo-options';

type Props = {
  count: number;
  receitasVinculadas: ProdutoResumoComReceitas['receitas_vinculadas'];
};

function buildTooltipLines(
  receitasVinculadas: ProdutoResumoComReceitas['receitas_vinculadas'],
): string[] {
  return Object.entries(receitasVinculadas)
    .filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => {
      const [, vinculo] = entry;
      return Boolean(vinculo?.ativo);
    })
    .map(([tipo, vinculo]) => {
      const label =
        PRODUTO_RECEITA_TIPO_LABELS[tipo as keyof typeof PRODUTO_RECEITA_TIPO_LABELS] ??
        tipo;
      return `${label}: ${vinculo.receita_nome} (${vinculo.quantidade})`;
    });
}

export default function ProdutoReceitasCountBadge({ count, receitasVinculadas }: Props) {
  const label = count === 1 ? '1 receita' : `${count} receitas`;
  const tooltipLines = buildTooltipLines(receitasVinculadas);
  const tooltip = tooltipLines.length > 0 ? tooltipLines.join('\n') : undefined;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums ${
        count > 0
          ? 'border-gray-200 bg-gray-50 text-gray-700'
          : 'border-gray-100 bg-gray-50 text-gray-500'
      }`}
      title={tooltip}
      aria-label={
        tooltip
          ? `${label}. ${tooltipLines.join('. ')}`
          : count > 0
            ? label
            : 'Nenhuma receita vinculada'
      }
    >
      <span className="material-icons text-sm" aria-hidden="true">
        menu_book
      </span>
      {label}
    </span>
  );
}
