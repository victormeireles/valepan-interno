import type { ProdutoAssadeiraLink } from '@/domain/assadeiras/produto-assadeira-types';
import { resolveUnidadesPorAssadeiraEfetiva } from '@/domain/producao/assadeira-factor';

type AssadeiraJoinRow = {
  nome: string | null;
  unidades_por_assadeira: number | null;
  ativo: boolean;
};

type ProdutoAssadeiraLinkRow = {
  id: string;
  produto_id: string;
  assadeira_id: string;
  unidades_por_assadeira: number | null;
  ordem: number;
  assadeiras: AssadeiraJoinRow | AssadeiraJoinRow[] | null;
};

function mapAssadeiraJoin(
  assadeiras: AssadeiraJoinRow | AssadeiraJoinRow[] | null,
): AssadeiraJoinRow | null {
  if (!assadeiras) return null;
  return Array.isArray(assadeiras) ? (assadeiras[0] ?? null) : assadeiras;
}

export function mapProdutoAssadeiraLinkRow(
  row: ProdutoAssadeiraLinkRow,
): ProdutoAssadeiraLink {
  const assadeira = mapAssadeiraJoin(row.assadeiras);
  const assadeiraPadrao = assadeira?.unidades_por_assadeira ?? null;

  return {
    id: row.id,
    produto_id: row.produto_id,
    assadeira_id: row.assadeira_id,
    unidades_por_assadeira: row.unidades_por_assadeira,
    ordem: row.ordem ?? 0,
    assadeira_nome: assadeira?.nome ?? 'Assadeira',
    assadeira_padrao: assadeiraPadrao,
    assadeira_ativo: assadeira?.ativo ?? false,
    unidades_efetivas: resolveUnidadesPorAssadeiraEfetiva({
      produto: row.unidades_por_assadeira,
      assadeira: assadeiraPadrao,
    }),
  };
}
