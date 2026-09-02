import { describe, expect, it } from 'vitest';

import { FluxoDisplayScale } from '@/components/FluxoProcesso/fluxo-display-scale';

import { FluxoProcessoBuilder } from './fluxo-processo-builder';
import { FluxoUnidadesConverter } from './fluxo-unidades-converter';

function isoAt(dateISO: string, hour: number, minute: number): string {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${dateISO}T${hh}:${mm}:00-03:00`;
}

describe('caixa de outra OP no gráfico', () => {
  it('resolveUnidades registra fator do produto embalado fora da OP do dia', () => {
    const converter = new FluxoUnidadesConverter([
      {
        produtoNome: 'HB Brioche 65g',
        assadeiraNome: '65g verde',
        unidades: 2400,
        latas: 100,
        caixas: 50,
      },
    ]);
    expect(converter.unPorCaixaKnown('Hot Dog Brioche 70g')).toBeNull();
    expect(
      converter.resolveUnidades({
        unidades: 0,
        caixas: 8,
        produtoNome: 'Hot Dog Brioche 70g',
        assadeiraNome: 'N/A',
        etapa: 'emb',
      }),
    ).toBe(384);
    expect(converter.unPorCaixaKnown('Hot Dog Brioche 70g')).toBe(48);
  });

  it('barra CX das 23h mostra lote em caixa da OP anterior', () => {
    const payload = new FluxoProcessoBuilder().build({
      dateISO: '2026-09-02',
      planoUn: 2400,
      ordensDia: [
        {
          produtoNome: 'HB Brioche 65g',
          assadeiraNome: '65g verde',
          unidades: 2400,
          latas: 100,
          caixas: 50,
        },
      ],
      fermentacao: [
        {
          produzidoEm: isoAt('2026-09-01', 23, 10),
          produtoNome: 'Hot Dog Brioche 70g',
          assadeiraNome: 'N/A',
          unidades: 0,
          latas: 10,
          dataOp: '2026-09-01',
        },
      ],
      forno: [
        {
          produzidoEm: isoAt('2026-09-01', 23, 40),
          produtoNome: 'Hot Dog Brioche 70g',
          assadeiraNome: 'N/A',
          unidades: 0,
          latas: 8,
          dataOp: '2026-09-01',
        },
      ],
      embalagem: [
        {
          produzidoEm: isoAt('2026-09-01', 23, 46),
          produtoNome: 'Hot Dog Brioche 70g',
          assadeiraNome: 'N/A',
          unidades: 0,
          caixas: 8,
          dataOp: '2026-09-01',
        },
        {
          produzidoEm: isoAt('2026-09-02', 0, 4),
          produtoNome: 'HB Mini Brioche Bun Cortado 20g',
          assadeiraNome: 'N/A',
          unidades: 0,
          caixas: 30,
          dataOp: '2026-09-01',
        },
      ],
    });

    expect(payload.unPorCaixaByProduto['Hot Dog Brioche 70g']).toBe(48);
    expect(payload.unPorCaixaByProduto['HB Mini Brioche Bun Cortado 20g']).toBe(
      48,
    );

    const cx = new FluxoDisplayScale(payload, 'cx');
    expect(cx.horaTotal('emb', 23)).toBe(8);
    expect(cx.horaTotal('emb', 0)).toBe(30);

    const lt = new FluxoDisplayScale(payload, 'lt');
    expect(lt.horaTotal('ferm', 23)).toBeGreaterThan(0);
    expect(lt.horaTotal('forno', 23)).toBeGreaterThan(0);
  });
});
