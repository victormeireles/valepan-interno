import type { ProdutoResumoComReceitas } from '@/app/actions/produto-receitas-actions';
import { PRODUTO_RECEITA_TIPO_LABELS } from '@/components/ProdutosConfig/produto-receita-tipo-options';

export function buildReceitasTooltip(
  receitasVinculadas: ProdutoResumoComReceitas['receitas_vinculadas'],
): string | undefined {
  const lines = Object.entries(receitasVinculadas)
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

  return lines.length > 0 ? lines.join('\n') : undefined;
}
