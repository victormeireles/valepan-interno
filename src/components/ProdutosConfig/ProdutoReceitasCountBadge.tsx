'use client';

import type { ProdutoResumoComReceitas } from '@/app/actions/produto-receitas-actions';
import { buildReceitasTooltip } from '@/components/ProdutosConfig/produto-receitas-tooltip';
import { Badge } from '@/components/ui/Badge';

type Props = {
  count: number;
  receitasVinculadas: ProdutoResumoComReceitas['receitas_vinculadas'];
};

export default function ProdutoReceitasCountBadge({ count, receitasVinculadas }: Props) {
  const tooltip = buildReceitasTooltip(receitasVinculadas);
  const label = count === 1 ? '1 receita' : `${count} receitas`;

  return (
    <Badge
      tone={count > 0 ? 'neutral' : 'outline'}
      icon="menu_book"
      numeric
      title={tooltip}
      aria-label={
        tooltip
          ? `${label}. ${tooltip.replace(/\n/g, '. ')}`
          : count > 0
            ? label
            : 'Nenhuma receita vinculada'
      }
    >
      {count > 0 ? label : '—'}
    </Badge>
  );
}
