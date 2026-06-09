import { describe, expect, it, vi } from 'vitest';
import { aggregatePedidosFromSheetRows } from './map-sheet-rows-to-pedidos';

describe('aggregatePedidosFromSheetRows', () => {
  it('merges two rows with same business key', async () => {
    const resolveIds = vi.fn().mockResolvedValue({
      tipoEstoqueId: 't1',
      produtoId: 'p1',
    });
    const resolveAssadeira = vi.fn().mockResolvedValue({
      assadeiraId: 'ass-1',
      unidadesPorAssadeiraEfetiva: 24,
      boxUnits: 12,
    });

    const rows = [
      ['2026-06-03', '2026-06-04', 'Cliente X', '', 'Pão', 'Não', 10, 0, 0, 0],
      ['2026-06-03', '2026-06-04', 'Cliente X', '', 'Pão', 'Sim', 5, 0, 0, 0],
    ];

    const map = await aggregatePedidosFromSheetRows(rows, {
      dataProducaoFilter: '2026-06-03',
      resolveIds,
      resolveAssadeira,
    });

    expect(map.size).toBe(1);
    const entry = [...map.values()][0];
    expect(entry.assadeiras).toBe(7.5);
    expect(entry.quantidade.caixas).toBe(15);
    expect(entry.quantidade.unidades).toBe(180);
    expect(resolveIds).toHaveBeenCalledTimes(2);
    expect(resolveAssadeira).toHaveBeenCalledTimes(2);
  });

  it('filters by dataProducao', async () => {
    const resolveIds = vi.fn().mockResolvedValue({
      tipoEstoqueId: 't1',
      produtoId: 'p1',
    });
    const resolveAssadeira = vi.fn().mockResolvedValue({
      assadeiraId: 'ass-1',
      unidadesPorAssadeiraEfetiva: 24,
      boxUnits: 12,
    });

    const rows = [
      ['2026-06-02', '2026-06-04', 'C', '', 'P', 'Não', 1, 0, 0, 0],
      ['2026-06-03', '2026-06-04', 'C', '', 'P', 'Não', 2, 0, 0, 0],
    ];

    const map = await aggregatePedidosFromSheetRows(rows, {
      dataProducaoFilter: '2026-06-03',
      resolveIds,
      resolveAssadeira,
    });

    expect(map.size).toBe(1);
    expect([...map.values()][0].quantidade.caixas).toBe(2);
  });

  it('ignora linhas de lote parcial legado (G–J = M–P) na soma da meta', async () => {
    const resolveIds = vi.fn().mockResolvedValue({
      tipoEstoqueId: 't1',
      produtoId: 'p1',
    });
    const resolveAssadeira = vi.fn().mockResolvedValue({
      assadeiraId: 'ass-1',
      unidadesPorAssadeiraEfetiva: 24,
      boxUnits: 12,
    });

    const metaRow = Array<string | number>(16).fill('');
    metaRow[0] = '2026-06-09';
    metaRow[1] = '2026-06-09';
    metaRow[2] = 'Valepan';
    metaRow[4] = 'HB Brioche 65g';
    metaRow[6] = 3;

    const loteRow = Array<string | number>(16).fill('');
    loteRow[0] = '2026-06-09';
    loteRow[1] = '2026-06-09';
    loteRow[2] = 'Valepan';
    loteRow[4] = 'HB Brioche 65g';
    loteRow[6] = 2;
    loteRow[12] = 2;

    const map = await aggregatePedidosFromSheetRows([metaRow, loteRow], {
      dataProducaoFilter: '2026-06-09',
      resolveIds,
      resolveAssadeira,
    });

    expect(map.size).toBe(1);
    expect([...map.values()][0].quantidade.caixas).toBe(3);
  });
});
