import {
  appendRows,
  getGoogleSheetsClient,
  readSheetValues,
} from '@/lib/googleSheets';
import {
  ESTOQUE_SHEET_COLUMNS,
  INVENTARIO_SHEET_CONFIG,
  EstoqueQuantidadeColumns,
} from '@/config/inventario';
import { EstoqueRecord, Quantidade } from '@/domain/types/inventario';

const ESTOQUE_FULL_RANGE = 'A:H';
const ESTOQUE_DATA_RANGE = 'A2:H';

type ClienteProdutoKey = {
  cliente: string;
  produto: string;
};

export class EstoqueSheetManager {
  private readonly spreadsheetId: string;
  private readonly tabName: string;
  private readonly quantidadeColumns: EstoqueQuantidadeColumns;

  constructor() {
    this.spreadsheetId =
      INVENTARIO_SHEET_CONFIG.destinoEstoque.spreadsheetId;
    this.tabName = INVENTARIO_SHEET_CONFIG.destinoEstoque.tabName;
    this.quantidadeColumns =
      INVENTARIO_SHEET_CONFIG.destinoEstoque.quantidadeColumns;
  }

  public async listAll(): Promise<EstoqueRecord[]> {
    const rows = await readSheetValues(
      this.spreadsheetId,
      `${this.tabName}!${ESTOQUE_FULL_RANGE}`,
    );

    return rows.slice(1).reduce<EstoqueRecord[]>((acc, row) => {
      const record = this.mapRow(row);
      if (record) acc.push(record);
      return acc;
    }, []);
  }

  public async listByCliente(cliente: string): Promise<EstoqueRecord[]> {
    const all = await this.listAll();
    const clienteNormalizado = cliente.trim();
    return all.filter((record) => record.cliente.trim() === clienteNormalizado);
  }

  public async replaceClienteEstoque(
    cliente: string,
    itens: Array<{ produto: string; quantidade: Quantidade }>,
    metadata?: { inventarioAtualizadoEm?: string; atualizadoEm?: string },
  ): Promise<void> {
    const allRows = await readSheetValues(
      this.spreadsheetId,
      `${this.tabName}!${ESTOQUE_FULL_RANGE}`,
    );
    const dataRows = allRows.slice(1);
    const clienteNormalizado = cliente.trim();
    const preservedRows = dataRows.filter(
      (row) => (row[ESTOQUE_SHEET_COLUMNS.cliente] || '').toString().trim() !== clienteNormalizado,
    );
    const atualizadoEm =
      metadata?.atualizadoEm ?? new Date().toISOString();
    const inventarioAtualizadoEm =
      metadata?.inventarioAtualizadoEm ?? atualizadoEm;

    const newRows = itens.map((item) => [
      clienteNormalizado,
      item.produto.trim(),
      item.quantidade.caixas || 0,
      item.quantidade.pacotes || 0,
      item.quantidade.unidades || 0,
      item.quantidade.kg || 0,
      inventarioAtualizadoEm,
      atualizadoEm,
    ]);

    const mergedRows = [...preservedRows, ...newRows];
    await this.rewriteDataRows(mergedRows);
  }

  public async upsertQuantidade(
    key: ClienteProdutoKey,
    quantidade: Quantidade,
    metadata?: { inventarioAtualizadoEm?: string; atualizadoEm?: string },
  ): Promise<void> {
    const allRows = await readSheetValues(
      this.spreadsheetId,
      `${this.tabName}!${ESTOQUE_FULL_RANGE}`,
    );
    const dataRows = allRows.slice(1);
    const atualizadoEm =
      metadata?.atualizadoEm ?? new Date().toISOString();

    let found = false;
    const keyClienteNormalizado = key.cliente.trim();
    const keyProdutoNormalizado = key.produto.trim();
    
    const updatedRows = dataRows.map((row) => {
      const rowCliente = (row[ESTOQUE_SHEET_COLUMNS.cliente] || '')
        .toString()
        .trim();
      const rowProduto = (row[ESTOQUE_SHEET_COLUMNS.produto] || '')
        .toString()
        .trim();

      if (rowCliente === keyClienteNormalizado && rowProduto === keyProdutoNormalizado) {
        found = true;
        return [
          keyClienteNormalizado,
          keyProdutoNormalizado,
          quantidade.caixas || 0,
          quantidade.pacotes || 0,
          quantidade.unidades || 0,
          quantidade.kg || 0,
          row[ESTOQUE_SHEET_COLUMNS.inventarioAtualizadoEm] || '',
          metadata?.atualizadoEm ?? atualizadoEm,
        ];
      }

      return row;
    });

    if (!found) {
      const inventarioAtualizadoEm =
        metadata?.inventarioAtualizadoEm ?? atualizadoEm;
      updatedRows.push([
        keyClienteNormalizado,
        keyProdutoNormalizado,
        quantidade.caixas || 0,
        quantidade.pacotes || 0,
        quantidade.unidades || 0,
        quantidade.kg || 0,
        inventarioAtualizadoEm,
        atualizadoEm,
      ]);
    }

    await this.rewriteDataRows(updatedRows);
  }

  private async rewriteDataRows(rows: (string | number)[][]): Promise<void> {
    const sheets = await getGoogleSheetsClient();
    await sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `${this.tabName}!${ESTOQUE_DATA_RANGE}`,
    });
    if (rows.length === 0) return;
    await appendRows(this.spreadsheetId, this.tabName, rows);
  }

  private mapRow(row: string[]): EstoqueRecord | null {
    const cliente = (row[ESTOQUE_SHEET_COLUMNS.cliente] || '')
      .toString()
      .trim();
    const produto = (row[ESTOQUE_SHEET_COLUMNS.produto] || '')
      .toString()
      .trim();

    if (!cliente || !produto) {
      return null;
    }

    return {
      cliente,
      produto,
      quantidade: this.parseQuantidade(row),
      inventarioAtualizadoEm:
        row[ESTOQUE_SHEET_COLUMNS.inventarioAtualizadoEm] || undefined,
      atualizadoEm: row[ESTOQUE_SHEET_COLUMNS.atualizadoEm] || '',
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

export const estoqueSheetManager = new EstoqueSheetManager();


