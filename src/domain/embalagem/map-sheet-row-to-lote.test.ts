import { describe, expect, it } from 'vitest';
import {
  mapRowToLoteInsert,
  parseProduzidoEmFromRow,
  rowTemProducao,
  SHEET_COL,
} from './map-sheet-row-to-lote';

function emptyRow(): string[] {
  return Array(29).fill('');
}

describe('rowTemProducao', () => {
  it('false when M-P are zero', () => {
    expect(rowTemProducao(emptyRow())).toBe(false);
  });

  it('true when any production column > 0', () => {
    const row = emptyRow();
    row[SHEET_COL.producaoCaixas] = '2';
    expect(rowTemProducao(row)).toBe(true);
  });
});

describe('parseProduzidoEmFromRow', () => {
  it('prefers column Q', () => {
    const row = emptyRow();
    row[SHEET_COL.producaoUpdatedAt] = '2026-06-01T10:00:00.000Z';
    expect(parseProduzidoEmFromRow(row)).toBe('2026-06-01T10:00:00.000Z');
  });
});

describe('mapRowToLoteInsert', () => {
  it('maps production columns and modo importado', () => {
    const row = emptyRow();
    row[SHEET_COL.dataPedido] = '2026-06-02';
    row[SHEET_COL.dataFabricacao] = '2026-06-02';
    row[SHEET_COL.congelado] = 'Sim';
    row[SHEET_COL.producaoCaixas] = '3';
    row[SHEET_COL.lote] = '42';

    const insert = mapRowToLoteInsert(row, 10, {
      tipoEstoqueId: 'tipo-1',
      produtoId: 'prod-1',
    });

    expect(insert.modo).toBe('importado');
    expect(insert.planilhaRowId).toBe(10);
    expect(insert.quantidade.caixas).toBe(3);
    expect(insert.congelado).toBe('Sim');
    expect(insert.lote).toBe(42);
  });
});
