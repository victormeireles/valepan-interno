import { resolveUnidadesPorAssadeiraEfetiva } from '@/domain/producao/assadeira-factor';
import type { AssadeiraVinculoOrigem, AssadeiraVinculoResolvido } from '@/domain/assadeiras/assadeira-resolver-types';

type AssadeiraJoin = {
  nome: string | null;
  unidades_por_assadeira: number | null;
  ativo: boolean;
};

export function mapAssadeiraJoin(
  assadeiras: AssadeiraJoin | AssadeiraJoin[] | null,
): AssadeiraJoin | null {
  if (!assadeiras) return null;
  return Array.isArray(assadeiras) ? (assadeiras[0] ?? null) : assadeiras;
}

export function buildVinculoResolvido(
  assadeiraId: string,
  assadeira: AssadeiraJoin | null,
  override: number | null,
  origem: AssadeiraVinculoOrigem,
): AssadeiraVinculoResolvido | null {
  if (!assadeira?.ativo) return null;
  const assadeiraPadrao = assadeira.unidades_por_assadeira ?? null;
  const unidadesEfetivas = resolveUnidadesPorAssadeiraEfetiva({
    produto: override,
    assadeira: assadeiraPadrao,
  });
  if (!unidadesEfetivas) return null;
  return {
    assadeira_id: assadeiraId,
    assadeira_nome: assadeira.nome ?? 'Assadeira',
    unidades_por_assadeira: override,
    unidades_efetivas: unidadesEfetivas,
    assadeira_padrao: assadeiraPadrao,
    origem,
  };
}
