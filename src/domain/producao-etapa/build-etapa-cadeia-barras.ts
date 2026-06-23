import type { EtapaCadeiaBarra } from '@/components/Realizado/etapa/etapa-cadeia-progresso-types';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';

export type EtapaCadeiaContexto = {
  etapa: 'fermentacao' | 'forno';
  fermentacaoProduzido?: number | null;
};

function buildBarraBase(
  ordem: PainelOrdemEtapa,
  barra: Omit<EtapaCadeiaBarra, 'meta' | 'unidade' | 'metaOp'>,
): EtapaCadeiaBarra {
  return {
    ...barra,
    meta: ordem.aProduzir,
    unidade: ordem.unidade,
    metaOp: ordem.metaPlanejada,
  };
}

function buildFermentacaoBarra(ordem: PainelOrdemEtapa): EtapaCadeiaBarra {
  return buildBarraBase(ordem, {
    slug: 'fermentacao',
    label: 'Fermentação',
    icon: 'bakery_dining',
    produzido: ordem.produzido,
    finalizada: ordem.finalizada,
    destaque: true,
  });
}

function buildFornoBarras(
  ordem: PainelOrdemEtapa,
  contexto: EtapaCadeiaContexto,
): EtapaCadeiaBarra[] {
  const fermentacaoProduzidoReal =
    typeof contexto.fermentacaoProduzido === 'number'
      ? contexto.fermentacaoProduzido
      : null;
  const fermentacaoEstimativa =
    typeof ordem.estimativaAnterior === 'number' ? ordem.estimativaAnterior : null;
  const fermentacaoValor = fermentacaoProduzidoReal ?? fermentacaoEstimativa ?? 0;

  const fermentacaoBarra = buildBarraBase(ordem, {
    slug: 'fermentacao',
    label: 'Fermentação',
    icon: 'bakery_dining',
    produzido: fermentacaoValor,
    estimativaAoVivo:
      fermentacaoProduzidoReal === null ? fermentacaoEstimativa : null,
    finalizada:
      fermentacaoProduzidoReal !== null &&
      fermentacaoProduzidoReal >= ordem.aProduzir,
    destaque: false,
  });

  const fornoBarra = buildBarraBase(ordem, {
    slug: 'forno',
    label: 'Forno',
    icon: 'local_fire_department',
    produzido: ordem.produzido,
    finalizada: ordem.finalizada,
    destaque: true,
  });

  return [fermentacaoBarra, fornoBarra];
}

export function buildEtapaCadeiaBarras(
  ordem: PainelOrdemEtapa,
  contexto: EtapaCadeiaContexto,
): EtapaCadeiaBarra[] {
  if (contexto.etapa === 'fermentacao') {
    return [buildFermentacaoBarra(ordem)];
  }

  return buildFornoBarras(ordem, contexto);
}
