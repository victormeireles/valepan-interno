import { getBrazilHourFromIso } from '@/lib/utils/date-utils';

import type { FluxoEtapaKey, FluxoProdutoAssadeira } from './fluxo-processo-types';

export type FluxoPercursoCelulaFiltro = {
  etapa: FluxoEtapaKey;
  hora: number;
};

type EventoProduto = {
  produzidoEm: string;
  produtoNome: string;
  assadeiraNome: string;
  unidades: number;
  opAnterior: boolean;
};

function emptyHoras(): number[] {
  return Array.from({ length: 24 }, () => 0);
}

function emptyProduto(nome: string): FluxoProdutoAssadeira {
  return {
    nome,
    ferm: 0,
    forno: 0,
    emb: 0,
    embAnt: 0,
    fermHoras: emptyHoras(),
    fornoHoras: emptyHoras(),
    embHoras: emptyHoras(),
  };
}

/**
 * Agrega produtos de uma assadeira com totais do dia e matrizes horárias.
 */
export class FluxoProdutosAssadeiraAggregator {
  collect(
    ass: string,
    ferm: EventoProduto[],
    forno: EventoProduto[],
    emb: EventoProduto[],
  ): FluxoProdutoAssadeira[] {
    const map = new Map<string, FluxoProdutoAssadeira>();
    this.touch(map, ass, ferm, 'ferm');
    this.touch(map, ass, forno, 'forno');
    this.touch(map, ass, emb, 'emb');
    return [...map.values()].sort(
      (a, b) => b.ferm + b.forno + b.emb - (a.ferm + a.forno + a.emb),
    );
  }

  private touch(
    map: Map<string, FluxoProdutoAssadeira>,
    ass: string,
    rows: EventoProduto[],
    key: FluxoEtapaKey,
  ): void {
    const horasKey = `${key}Horas` as const;
    for (const e of rows) {
      if (e.assadeiraNome !== ass) continue;
      const row = map.get(e.produtoNome) ?? emptyProduto(e.produtoNome);
      row[key] += e.unidades;
      if (key === 'emb' && e.opAnterior) row.embAnt += e.unidades;
      const hour = getBrazilHourFromIso(e.produzidoEm);
      if (hour != null && hour >= 0 && hour <= 23) {
        row[horasKey][hour] += e.unidades;
      }
      map.set(e.produtoNome, row);
    }
  }
}

/**
 * Filtra produtos para a célula (etapa × hora) selecionada no percurso.
 */
export class FluxoProdutosHoraFilter {
  apply(
    produtos: FluxoProdutoAssadeira[],
    filtro: FluxoPercursoCelulaFiltro | null,
  ): FluxoProdutoAssadeira[] {
    if (!filtro) return produtos;
    const horasKey = `${filtro.etapa}Horas` as const;
    return produtos
      .map((p) => {
        const naHora = p[horasKey][filtro.hora] ?? 0;
        return {
          ...p,
          ferm: filtro.etapa === 'ferm' ? naHora : 0,
          forno: filtro.etapa === 'forno' ? naHora : 0,
          emb: filtro.etapa === 'emb' ? naHora : 0,
          embAnt: 0,
        };
      })
      .filter((p) => p.ferm + p.forno + p.emb > 0)
      .sort((a, b) => b.ferm + b.forno + b.emb - (a.ferm + a.forno + a.emb));
  }
}
