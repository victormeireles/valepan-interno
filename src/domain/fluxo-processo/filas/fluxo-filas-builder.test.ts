import { describe, expect, it } from 'vitest';
import { brazilDayEndUtcMs } from '@/lib/utils/date-utils';
import { FluxoFilasBuilder } from './fluxo-filas-builder';
import type { FluxoFilasBuilderInput, FluxoFilasOpInput } from './fluxo-filas-types';

const DATE = '2026-08-12';
const builder = new FluxoFilasBuilder();

function iso(hhmm: string): string {
  return `${DATE}T${hhmm}:00-03:00`;
}

function op(partial: Partial<FluxoFilasOpInput> & Pick<FluxoFilasOpInput, 'id'>): FluxoFilasOpInput {
  return {
    ordemPlanejamento: 1,
    produtoNome: 'Bun',
    assadeiraNome: 'Bun',
    observacao: '',
    unidades: 100,
    latas: 0,
    caixas: 0,
    dataProducao: DATE,
    ...partial,
  };
}

function baseInput(overrides: Partial<FluxoFilasBuilderInput> = {}): FluxoFilasBuilderInput {
  return {
    ops: [op({ id: 'op-1' })],
    opsAnteriores: [],
    eventosFerm: [],
    eventosForno: [],
    eventosEmb: [],
    camaraMin: 180,
    resfrioMin: 60,
    asOfMs: Date.parse(iso('12:00')),
    ...overrides,
  };
}

describe('FluxoFilasBuilder', () => {
  it('OP sem fermentação entra em a produzir', () => {
    const result = builder.build(baseInput());
    expect(result?.aProduzir.totalUn).toBe(100);
    expect(result?.aProduzir.items).toHaveLength(1);
    expect(result?.fermentando.totalUn).toBe(0);
    expect(result?.resfriando.totalUn).toBe(0);
  });

  it('fermentando = ferm - forno', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 100, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
        eventosForno: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 40, produzidoEm: iso('09:00'), dataOp: DATE },
        ],
      }),
    );
    expect(result?.aProduzir.totalUn).toBe(0);
    expect(result?.fermentando.totalUn).toBe(60);
    expect(result?.embalado.totalUn).toBe(0);
  });

  it('OP parcial soma nas quatro filas (928 planejado, 800 ferm, 580 forno, 0 emb)', () => {
    const result = builder.build(
      baseInput({
        ops: [
          op({
            id: 'op-brioche',
            unidades: 928,
            produtoNome: 'HB Brioche 65g',
            observacao: '65g: 1a producao',
          }),
        ],
        eventosFerm: [
          {
            ordemProducaoId: 'op-brioche',
            produtoNome: 'HB Brioche 65g',
            assadeiraNome: 'Bun',
            unidades: 800,
            produzidoEm: iso('06:00'),
            dataOp: DATE,
          },
        ],
        eventosForno: [
          {
            ordemProducaoId: 'op-brioche',
            produtoNome: 'HB Brioche 65g',
            assadeiraNome: 'Bun',
            unidades: 580,
            produzidoEm: iso('10:00'),
            dataOp: DATE,
          },
        ],
        eventosEmb: [],
      }),
    );
    expect(result?.aProduzir.totalUn).toBe(128);
    expect(result?.fermentando.totalUn).toBe(220);
    expect(result?.resfriando.totalUn).toBe(580);
    expect(result?.embalado.totalUn).toBe(0);
    expect(result?.aProduzir.items[0].observacao).toBe('65g: 1a producao');
  });

  it('OP parcial: saldo a produzir + fermentando por lote + resfriando', () => {
    const result = builder.build(
      baseInput({
        ops: [op({ id: 'op-1', unidades: 1000 })],
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 100, produzidoEm: iso('06:00'), dataOp: DATE },
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 100, produzidoEm: iso('11:00'), dataOp: DATE },
        ],
        eventosForno: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 50, produzidoEm: iso('10:00'), dataOp: DATE },
        ],
        asOfMs: Date.parse(iso('12:00')),
      }),
    );
    expect(result?.aProduzir.totalUn).toBe(800);
    expect(result?.fermentando.totalUn).toBe(150);
    expect(result?.resfriando.totalUn).toBe(50);
    expect(result?.fermentando.items).toHaveLength(2);
    expect(result?.fermentando.items.find((i) => i.ultimoLoteEm === iso('06:00'))?.volumeUn).toBe(50);
    expect(result?.fermentando.items.find((i) => i.ultimoLoteEm === iso('06:00'))?.preso).toBe(true);
    expect(result?.fermentando.items.find((i) => i.ultimoLoteEm === iso('11:00'))?.preso).toBe(false);
  });

  it('marca preso quando último lote ferm + camaraMin < asOf', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 100, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
        asOfMs: Date.parse(iso('12:00')), // 6h depois > 180min
      }),
    );
    expect(result?.fermentando.presoUn).toBe(100);
    expect(result?.fermentando.items[0].presoMin).toBe(180);
    expect(result?.fermentando.items[0].naFilaMin).toBe(360);
  });

  it('não marca preso dentro do prazo de câmara', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 100, produzidoEm: iso('11:30'), dataOp: DATE },
        ],
        asOfMs: Date.parse(iso('12:00')),
      }),
    );
    expect(result?.fermentando.presoUn).toBe(0);
    expect(result?.fermentando.items[0].preso).toBe(false);
  });

  it('lote novo não zera o prazo do lote antigo', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 50, produzidoEm: iso('06:00'), dataOp: DATE },
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 50, produzidoEm: iso('11:50'), dataOp: DATE },
        ],
        asOfMs: Date.parse(iso('12:00')),
      }),
    );
    expect(result?.fermentando.presoUn).toBe(50);
    expect(result?.fermentando.totalUn).toBe(100);
  });

  it('resfriando consome emb casado da mesma OP', () => {
    const result = builder.build(
      baseInput({
        ops: [op({ id: 'op-1', unidades: 100 })],
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 80, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
        eventosForno: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 80, produzidoEm: iso('10:00'), dataOp: DATE },
        ],
        eventosEmb: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 50, produzidoEm: iso('11:00'), dataOp: DATE },
        ],
      }),
    );
    expect(result?.embalado.totalUn).toBe(50);
    expect(result?.resfriando.totalUn).toBe(30);
  });

  it('resfriando conta prazo por lote de forno', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 80, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
        eventosForno: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 40, produzidoEm: iso('09:00'), dataOp: DATE },
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 40, produzidoEm: iso('11:30'), dataOp: DATE },
        ],
        asOfMs: Date.parse(iso('12:00')),
      }),
    );
    expect(result?.resfriando.totalUn).toBe(80);
    expect(result?.resfriando.presoUn).toBe(40);
    expect(result?.resfriando.items.find((i) => i.ultimoLoteEm === iso('09:00'))?.preso).toBe(true);
    expect(result?.resfriando.items.find((i) => i.ultimoLoteEm === iso('11:30'))?.preso).toBe(false);
  });

  it('marca preso em resfriando', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 80, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
        eventosForno: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 80, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
        asOfMs: Date.parse(iso('12:00')),
      }),
    );
    expect(result?.resfriando.presoUn).toBe(80);
  });

  it('OP iniciada joga o saldo restante em a produzir', () => {
    const result = builder.build(
      baseInput({
        ops: [op({ id: 'op-1', unidades: 100 })],
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 20, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
      }),
    );
    expect(result?.aProduzir.totalUn).toBe(80);
    expect(result?.fermentando.totalUn).toBe(20);
  });

  it('soma cada OP nas filas (totais = soma das linhas)', () => {
    const result = builder.build(
      baseInput({
        ops: [
          op({ id: 'op-a', ordemPlanejamento: 1, unidades: 100 }),
          op({ id: 'op-b', ordemPlanejamento: 2, unidades: 50, produtoNome: 'HB' }),
        ],
        eventosFerm: [
          { ordemProducaoId: 'op-a', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 40, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
        eventosForno: [
          { ordemProducaoId: 'op-a', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 10, produzidoEm: iso('10:00'), dataOp: DATE },
        ],
      }),
    );
    expect(result?.aProduzir.totalUn).toBe(110);
    expect(result?.fermentando.totalUn).toBe(30);
    expect(result?.resfriando.totalUn).toBe(10);
    expect(result?.embalado.totalUn).toBe(0);
  });

  it('embalado da OP do dia é o lote casado, não o teto da OP', () => {
    const result = builder.build(
      baseInput({
        ops: [op({ id: 'op-75', unidades: 81, produtoNome: 'HB Brioche 75g' })],
        eventosEmb: [
          {
            ordemProducaoId: 'op-75',
            produtoNome: 'HB Brioche 75g',
            assadeiraNome: 'Bun',
            unidades: 50,
            produzidoEm: iso('10:00'),
            dataOp: DATE,
          },
        ],
      }),
    );
    expect(result?.embalado.totalUn).toBe(50);
    expect(result?.embalado.anteriorUn).toBe(0);
    expect(result?.embalado.items[0]?.volumeUn).toBe(50);
  });

  it('lote de OP de ontem entra em anteriorUn, não no total do dia', () => {
    const result = builder.build(
      baseInput({
        ops: [op({ id: 'op-hoje', unidades: 81, produtoNome: 'HB Brioche 75g' })],
        opsAnteriores: [
          op({
            id: 'op-ontem',
            unidades: 70,
            produtoNome: 'HB Padrão',
            dataProducao: '2026-08-17',
            ordemPlanejamento: 7,
          }),
        ],
        eventosEmb: [
          {
            ordemProducaoId: 'op-hoje',
            produtoNome: 'HB Brioche 75g',
            assadeiraNome: 'Bun',
            unidades: 50,
            produzidoEm: iso('10:00'),
            dataOp: DATE,
          },
          {
            ordemProducaoId: 'op-ontem',
            produtoNome: 'HB Padrão',
            assadeiraNome: 'Bun',
            unidades: 31,
            produzidoEm: iso('08:00'),
            dataOp: '2026-08-17',
          },
        ],
      }),
    );
    expect(result?.embalado.totalUn).toBe(50);
    expect(result?.embalado.anteriorUn).toBe(31);
    expect(result?.embalado.items.filter((i) => i.origem === 'op_do_dia')).toHaveLength(1);
    expect(result?.embalado.items.find((i) => i.origem === 'op_anterior')?.dataOp).toBe(
      '2026-08-17',
    );
  });

  it('lote de outro produto não enche a OP do Brioche', () => {
    const result = builder.build(
      baseInput({
        ops: [
          op({
            id: 'op-75',
            unidades: 81,
            produtoNome: 'HB Brioche 75g',
            ordemPlanejamento: 4,
          }),
        ],
        eventosEmb: [
          {
            ordemProducaoId: 'op-outro',
            produtoNome: 'HB Padrão',
            assadeiraNome: 'Bun',
            unidades: 81,
            produzidoEm: iso('10:00'),
            dataOp: DATE,
          },
        ],
      }),
    );
    expect(result?.embalado.totalUn).toBe(0);
    expect(result?.embalado.items.some((i) => i.ordemProducaoId === 'op-75')).toBe(false);
  });

  it('emb de OP ontem não reduz resfriando de hoje', () => {
    const result = builder.build(
      baseInput({
        ops: [op({ id: 'op-hoje', unidades: 100 })],
        opsAnteriores: [op({ id: 'op-ontem', dataProducao: '2026-08-17', unidades: 50 })],
        eventosFerm: [
          {
            ordemProducaoId: 'op-hoje',
            produtoNome: 'Bun',
            assadeiraNome: 'Bun',
            unidades: 80,
            produzidoEm: iso('06:00'),
            dataOp: DATE,
          },
        ],
        eventosForno: [
          {
            ordemProducaoId: 'op-hoje',
            produtoNome: 'Bun',
            assadeiraNome: 'Bun',
            unidades: 80,
            produzidoEm: iso('10:00'),
            dataOp: DATE,
          },
        ],
        eventosEmb: [
          {
            ordemProducaoId: 'op-ontem',
            produtoNome: 'Bun',
            assadeiraNome: 'Bun',
            unidades: 50,
            produzidoEm: iso('11:00'),
            dataOp: '2026-08-17',
          },
        ],
      }),
    );
    expect(result?.resfriando.totalUn).toBe(80);
    expect(result?.embalado.anteriorUn).toBe(50);
  });

  it('lote sem OP entra em anteriorUn e não reduz resfriando', () => {
    const result = builder.build(
      baseInput({
        ops: [op({ id: 'op-1', unidades: 100 })],
        eventosFerm: [
          {
            ordemProducaoId: 'op-1',
            produtoNome: 'Bun',
            assadeiraNome: 'Bun',
            unidades: 80,
            produzidoEm: iso('06:00'),
            dataOp: DATE,
          },
        ],
        eventosForno: [
          {
            ordemProducaoId: 'op-1',
            produtoNome: 'Bun',
            assadeiraNome: 'Bun',
            unidades: 80,
            produzidoEm: iso('10:00'),
            dataOp: DATE,
          },
        ],
        eventosEmb: [
          {
            produtoNome: 'Padrão',
            assadeiraNome: 'Bun',
            unidades: 20,
            produzidoEm: iso('11:00'),
            dataOp: DATE,
          },
        ],
      }),
    );
    expect(result?.embalado.totalUn).toBe(0);
    expect(result?.embalado.anteriorUn).toBe(20);
    expect(result?.embalado.items[0]?.origem).toBe('sem_op');
    expect(result?.resfriando.totalUn).toBe(80);
  });

  it('duas datas anteriores: items ordenados da mais recente para a mais antiga', () => {
    const result = builder.build(
      baseInput({
        ops: [op({ id: 'op-hoje', unidades: 10 })],
        opsAnteriores: [
          op({
            id: 'op-16',
            dataProducao: '2026-08-16',
            ordemPlanejamento: 1,
            produtoNome: 'A',
          }),
          op({
            id: 'op-17',
            dataProducao: '2026-08-17',
            ordemPlanejamento: 2,
            produtoNome: 'B',
          }),
        ],
        eventosEmb: [
          {
            ordemProducaoId: 'op-16',
            produtoNome: 'A',
            assadeiraNome: 'Bun',
            unidades: 5,
            produzidoEm: iso('09:00'),
            dataOp: '2026-08-16',
          },
          {
            ordemProducaoId: 'op-17',
            produtoNome: 'B',
            assadeiraNome: 'Bun',
            unidades: 7,
            produzidoEm: iso('10:00'),
            dataOp: '2026-08-17',
          },
        ],
      }),
    );
    const ants = result?.embalado.items.filter((i) => i.origem === 'op_anterior') ?? [];
    expect(ants.map((i) => i.dataOp)).toEqual(['2026-08-17', '2026-08-16']);
  });

  it('retorna null sem OPs', () => {
    expect(builder.build(baseInput({ ops: [] }))).toBeNull();
  });

  it('dia passado: asOf no fim do dia civil marca preso se limite já passou', () => {
    const eventosFerm = [
      {
        ordemProducaoId: 'op-1',
        produtoNome: 'Bun',
        assadeiraNome: 'Bun',
        unidades: 100,
        produzidoEm: iso('20:00'),
        dataOp: DATE,
      },
    ];
    const noFim = builder.build(
      baseInput({ eventosFerm, asOfMs: brazilDayEndUtcMs(DATE) }),
    );
    expect(noFim?.fermentando.items[0].preso).toBe(true);

    const antesDoLimite = builder.build(
      baseInput({ eventosFerm, asOfMs: Date.parse(iso('22:00')) }),
    );
    expect(antesDoLimite?.fermentando.items[0].preso).toBe(false);
  });
});
