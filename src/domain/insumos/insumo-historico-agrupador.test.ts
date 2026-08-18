import { describe, expect, it } from 'vitest';
import type { InsumoMovimentoOrigem, InsumoMovimentoRecord } from '@/domain/types/insumo-estoque';
import { InsumoHistoricoAgrupador, agruparItensHistoricoPorDia } from './insumo-historico-agrupador';

function movimento(
  id: string,
  origem: InsumoMovimentoOrigem,
  createdAt: string,
  extras: Partial<InsumoMovimentoRecord> = {},
): InsumoMovimentoRecord {
  return {
    id,
    createdAt,
    insumoId: 'ins-1',
    deltaQuantidade: extras.deltaQuantidade ?? 0,
    saldoResultante: extras.saldoResultante ?? 0,
    custoUnitario: extras.custoUnitario ?? 1,
    origem,
    numeroNf: extras.numeroNf ?? null,
    observacao: extras.observacao ?? null,
  };
}

const agrupador = new InsumoHistoricoAgrupador();

describe('InsumoHistoricoAgrupador', () => {
  it('lista vazia permanece vazia', () => {
    expect(agrupador.agrupar([])).toEqual([]);
  });

  it('mantém entrada e ajuste como linhas simples', () => {
    const entrada = movimento('e1', 'entrada_nf', '2026-08-18T13:15:00-03:00');
    const ajuste = movimento('a1', 'ajuste_manual', '2026-08-18T07:00:00-03:00');

    expect(agrupador.agrupar([entrada, ajuste])).toEqual([
      { kind: 'linha', movimento: entrada },
      { kind: 'linha', movimento: ajuste },
    ]);
  });

  it('mantém uma saída isolada como linha simples', () => {
    const saida = movimento('s1', 'producao_fermentacao', '2026-08-18T08:35:00-03:00');
    const ajuste = movimento('a1', 'ajuste_manual', '2026-08-18T07:00:00-03:00');

    expect(agrupador.agrupar([saida, ajuste])).toEqual([
      { kind: 'linha', movimento: saida },
      { kind: 'linha', movimento: ajuste },
    ]);
  });

  it('agrupa saídas consecutivas em um bloco', () => {
    const tarde = movimento('s2', 'producao_fermentacao', '2026-08-18T15:13:00-03:00');
    const cedo = movimento('s1', 'producao_fermentacao', '2026-08-18T14:35:00-03:00');

    expect(agrupador.agrupar([tarde, cedo])).toEqual([
      { kind: 'bloco', movimentos: [tarde, cedo] },
    ]);
  });

  it('quebra o bloco em entrada ou ajuste intercalados', () => {
    const s4 = movimento('s4', 'producao_fermentacao', '2026-08-18T15:13:00-03:00', {
      deltaQuantidade: -10,
    });
    const s3 = movimento('s3', 'producao_fermentacao', '2026-08-18T14:35:00-03:00', {
      deltaQuantidade: -10,
    });
    const entrada = movimento('e1', 'entrada_nf', '2026-08-18T13:15:00-03:00', {
      deltaQuantidade: 75,
    });
    const s2 = movimento('s2', 'producao_fermentacao', '2026-08-18T12:10:00-03:00', {
      deltaQuantidade: -10,
    });
    const s1 = movimento('s1', 'producao_fermentacao', '2026-08-18T08:35:00-03:00', {
      deltaQuantidade: -40,
    });
    const ajuste = movimento('a1', 'ajuste_manual', '2026-08-18T07:00:00-03:00', {
      deltaQuantidade: 100,
    });

    expect(agrupador.agrupar([s4, s3, entrada, s2, s1, ajuste])).toEqual([
      { kind: 'bloco', movimentos: [s4, s3] },
      { kind: 'linha', movimento: entrada },
      { kind: 'bloco', movimentos: [s2, s1] },
      { kind: 'linha', movimento: ajuste },
    ]);
  });

  it('agrupa etapas de produção diferentes se forem consecutivas', () => {
    const forno = movimento('f1', 'producao_forno', '2026-08-18T11:00:00-03:00');
    const ferm = movimento('fe1', 'producao_fermentacao', '2026-08-18T10:00:00-03:00');

    expect(agrupador.agrupar([forno, ferm])).toEqual([
      { kind: 'bloco', movimentos: [forno, ferm] },
    ]);
  });

  it('não agrupa resolução de pendência com saídas', () => {
    const saida = movimento('s1', 'producao_embalagem', '2026-08-18T10:00:00-03:00');
    const resolucao = movimento('r1', 'resolucao_pendencia', '2026-08-18T09:00:00-03:00');

    expect(agrupador.agrupar([saida, resolucao])).toEqual([
      { kind: 'linha', movimento: saida },
      { kind: 'linha', movimento: resolucao },
    ]);
  });

  it('quebra o bloco na virada do dia civil', () => {
    const hojeTarde = movimento('h1', 'producao_fermentacao', '2026-08-18T13:29:00-03:00');
    const hojeCedo = movimento('h2', 'producao_fermentacao', '2026-08-18T08:00:00-03:00');
    const ontemNoite = movimento('o1', 'producao_fermentacao', '2026-08-17T21:59:00-03:00');
    const ontemCedo = movimento('o2', 'producao_fermentacao', '2026-08-17T21:00:00-03:00');

    expect(agrupador.agrupar([hojeTarde, hojeCedo, ontemNoite, ontemCedo])).toEqual([
      { kind: 'bloco', movimentos: [hojeTarde, hojeCedo] },
      { kind: 'bloco', movimentos: [ontemNoite, ontemCedo] },
    ]);
  });

  it('separa itens em seções por dia civil', () => {
    const hoje = movimento('h1', 'producao_fermentacao', '2026-08-18T10:00:00-03:00');
    const ontem = movimento('o1', 'ajuste_manual', '2026-08-17T09:00:00-03:00');
    const itens = agrupador.agrupar([hoje, ontem]);

    expect(agruparItensHistoricoPorDia(itens)).toEqual([
      { dataISO: '2026-08-18', itens: [{ kind: 'linha', movimento: hoje }] },
      { dataISO: '2026-08-17', itens: [{ kind: 'linha', movimento: ontem }] },
    ]);
  });
});
