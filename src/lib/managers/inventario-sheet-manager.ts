import { appendRows, readSheetValues } from '@/lib/googleSheets';
import {
  INVENTARIO_SHEET_COLUMNS,
  INVENTARIO_SHEET_CONFIG,
  InventarioQuantidadeColumns,
} from '@/config/inventario';
import {
  InventarioLancamentoItem,
  InventarioRecord,
  Quantidade,
} from '@/domain/types/inventario';

const INVENTARIO_RANGE = 'A:I';

export class InventarioSheetManager {
  private readonly spreadsheetId: string;
  private readonly tabName: string;
  private readonly quantidadeColumns: InventarioQuantidadeColumns;

  constructor() {
    this.spreadsheetId =
      INVENTARIO_SHEET_CONFIG.destinoInventario.spreadsheetId;
    this.tabName = INVENTARIO_SHEET_CONFIG.destinoInventario.tabName;
    this.quantidadeColumns =
      INVENTARIO_SHEET_CONFIG.destinoInventario.quantidadeColumns;
  }

  public async listByCliente(cliente: string): Promise<InventarioRecord[]> {
    const rows = await readSheetValues(
      this.spreadsheetId,
      `${this.tabName}!${INVENTARIO_RANGE}`,
    );
    return rows
      .slice(1)
      .map((row) => this.mapRow(row))
      .filter((record): record is InventarioRecord => record !== null)
      .filter((record) => record.cliente === cliente);
  }

  public async registrarInventario(
    data: string,
    cliente: string,
    itens: InventarioLancamentoItem[],
  ): Promise<void> {
    if (itens.length === 0) return;

    const now = new Date().toISOString();
    const rows = itens.map((item) => [
      data,
      cliente,
      item.produto,
      item.quantidade.caixas || 0,
      item.quantidade.pacotes || 0,
      item.quantidade.unidades || 0,
      item.quantidade.kg || 0,
      now,
      now,
    ]);

    await appendRows(this.spreadsheetId, this.tabName, rows);
  }

  private mapRow(row: string[]): InventarioRecord | null {
    const data = (row[INVENTARIO_SHEET_COLUMNS.data] || '').toString().trim();
    const cliente = (row[INVENTARIO_SHEET_COLUMNS.cliente] || '')
      .toString()
      .trim();
    const produto = (row[INVENTARIO_SHEET_COLUMNS.produto] || '')
      .toString()
      .trim();

    if (!data || !cliente || !produto) {
      return null;
    }

    return {
      data,
      cliente,
      produto,
      quantidade: this.parseQuantidade(row),
      createdAt: row[INVENTARIO_SHEET_COLUMNS.createdAt] || '',
      updatedAt: row[INVENTARIO_SHEET_COLUMNS.updatedAt] || '',
    };
  }

  private parseQuantidade(row: string[]): Quantidade {
    return {
      caixas: this.toNumber(row[this.quantidadeColumns.caixas]),
      pacotes: this.toNumber(row[this.quantidadeColumns.pacotes]),
      unidades: this.toNumber(row[this.quantidadeColumns.unidades]),
      kg: this.toNumber(row[this.quantidadeColumns.kg]),
    };
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value || 0);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}

export const inventarioSheetManager = new InventarioSheetManager();


