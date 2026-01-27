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
    
    // Primeiro, consolidar duplicatas existentes na planilha
    const rowsConsolidadas = this.consolidarDuplicatas(dataRows);
    
    const clienteNormalizado = cliente.trim();
    const preservedRows = rowsConsolidadas.filter(
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
    // rewriteDataRows já consolida novamente como segurança extra
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
    
    // Primeiro, consolidar duplicatas existentes na planilha
    const rowsConsolidadas = this.consolidarDuplicatas(dataRows);
    
    const atualizadoEm =
      metadata?.atualizadoEm ?? new Date().toISOString();

    let found = false;
    const keyClienteNormalizado = key.cliente.trim();
    const keyProdutoNormalizado = key.produto.trim();
    
    const updatedRows = rowsConsolidadas.map((row) => {
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

    // rewriteDataRows já consolida novamente como segurança extra
    await this.rewriteDataRows(updatedRows);
  }

  private consolidarDuplicatas(rows: (string | number)[][]): (string | number)[][] {
    if (rows.length === 0) return rows;

    // Mapa para agrupar por cliente+produto
    const mapa = new Map<string, {
      cliente: string;
      produto: string;
      caixas: number;
      pacotes: number;
      unidades: number;
      kg: number;
      inventarioAtualizadoEm: string;
      atualizadoEm: string;
    }>();

    rows.forEach((row) => {
      const cliente = (row[ESTOQUE_SHEET_COLUMNS.cliente] || '').toString().trim();
      const produto = (row[ESTOQUE_SHEET_COLUMNS.produto] || '').toString().trim();
      
      if (!cliente || !produto) {
        // Linha inválida, ignorar
        return;
      }

      const key = `${cliente}|${produto}`;
      const caixas = this.toNumber(row[this.quantidadeColumns.caixas]);
      const pacotes = this.toNumber(row[this.quantidadeColumns.pacotes]);
      const unidades = this.toNumber(row[this.quantidadeColumns.unidades]);
      const kg = this.toNumber(row[this.quantidadeColumns.kg]);
      const inventarioAtualizadoEm = (row[ESTOQUE_SHEET_COLUMNS.inventarioAtualizadoEm] || '').toString();
      const atualizadoEm = (row[ESTOQUE_SHEET_COLUMNS.atualizadoEm] || '').toString();

      const existente = mapa.get(key);
      
      if (existente) {
        // Duplicata encontrada: somar quantidades
        existente.caixas += caixas;
        existente.pacotes += pacotes;
        existente.unidades += unidades;
        existente.kg = parseFloat((existente.kg + kg).toFixed(3));
        
        // Manter o inventarioAtualizadoEm mais antigo (ou o primeiro não vazio)
        if (inventarioAtualizadoEm && (!existente.inventarioAtualizadoEm || 
            (existente.inventarioAtualizadoEm && inventarioAtualizadoEm < existente.inventarioAtualizadoEm))) {
          existente.inventarioAtualizadoEm = inventarioAtualizadoEm;
        }
        
        // Manter o atualizadoEm mais recente
        if (atualizadoEm && (!existente.atualizadoEm || atualizadoEm > existente.atualizadoEm)) {
          existente.atualizadoEm = atualizadoEm;
        }
      } else {
        // Primeira ocorrência desta combinação cliente+produto
        mapa.set(key, {
          cliente,
          produto,
          caixas,
          pacotes,
          unidades,
          kg,
          inventarioAtualizadoEm,
          atualizadoEm,
        });
      }
    });

    // Converter o mapa de volta para array de linhas
    return Array.from(mapa.values()).map((item) => [
      item.cliente,
      item.produto,
      item.caixas,
      item.pacotes,
      item.unidades,
      item.kg,
      item.inventarioAtualizadoEm,
      item.atualizadoEm,
    ]);
  }

  private async rewriteDataRows(rows: (string | number)[][]): Promise<void> {
    // Consolidar duplicatas antes de salvar
    const rowsConsolidadas = this.consolidarDuplicatas(rows);
    
    const sheets = await getGoogleSheetsClient();
    await sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `${this.tabName}!${ESTOQUE_DATA_RANGE}`,
    });
    if (rowsConsolidadas.length === 0) return;
    await appendRows(this.spreadsheetId, this.tabName, rowsConsolidadas);
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


