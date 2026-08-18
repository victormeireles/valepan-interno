import type { InsumoMovimentoOrigem, InsumoMovimentoRecord } from '@/domain/types/insumo-estoque';
import { getBrazilDateISOFromInstant } from '@/lib/utils/date-utils';

export const INSUMO_SAIDA_PRODUCAO_ORIGENS: ReadonlySet<InsumoMovimentoOrigem> = new Set([
  'producao_fermentacao',
  'producao_forno',
  'producao_embalagem',
]);

export function isInsumoSaidaProducao(origem: InsumoMovimentoOrigem): boolean {
  return INSUMO_SAIDA_PRODUCAO_ORIGENS.has(origem);
}

export type InsumoHistoricoLinha = {
  kind: 'linha';
  movimento: InsumoMovimentoRecord;
};

export type InsumoHistoricoBloco = {
  kind: 'bloco';
  movimentos: InsumoMovimentoRecord[];
};

export type InsumoHistoricoItem = InsumoHistoricoLinha | InsumoHistoricoBloco;

export type InsumoHistoricoDiaSecao = {
  dataISO: string;
  itens: InsumoHistoricoItem[];
};

function diaCivilMovimento(movimento: InsumoMovimentoRecord): string {
  return getBrazilDateISOFromInstant(new Date(movimento.createdAt));
}

export function diaCivilHistoricoItem(item: InsumoHistoricoItem): string {
  const movimento = item.kind === 'bloco' ? item.movimentos[0] : item.movimento;
  return diaCivilMovimento(movimento);
}

export function agruparItensHistoricoPorDia(
  itens: readonly InsumoHistoricoItem[],
): InsumoHistoricoDiaSecao[] {
  const secoes: InsumoHistoricoDiaSecao[] = [];
  for (const item of itens) {
    const dataISO = diaCivilHistoricoItem(item);
    const ultima = secoes[secoes.length - 1];
    if (ultima && ultima.dataISO === dataISO) {
      ultima.itens.push(item);
    } else {
      secoes.push({ dataISO, itens: [item] });
    }
  }
  return secoes;
}

export class InsumoHistoricoAgrupador {
  agrupar(movimentos: readonly InsumoMovimentoRecord[]): InsumoHistoricoItem[] {
    const itens: InsumoHistoricoItem[] = [];
    let indice = 0;

    while (indice < movimentos.length) {
      const atual = movimentos[indice];
      if (!isInsumoSaidaProducao(atual.origem)) {
        itens.push({ kind: 'linha', movimento: atual });
        indice += 1;
        continue;
      }

      const inicio = indice;
      const diaBloco = diaCivilMovimento(atual);
      indice += 1;
      while (
        indice < movimentos.length &&
        isInsumoSaidaProducao(movimentos[indice].origem) &&
        diaCivilMovimento(movimentos[indice]) === diaBloco
      ) {
        indice += 1;
      }

      const grupo = movimentos.slice(inicio, indice);
      if (grupo.length === 1) {
        itens.push({ kind: 'linha', movimento: grupo[0] });
      } else {
        itens.push({ kind: 'bloco', movimentos: grupo });
      }
    }

    return itens;
  }
}
