import {
  appendRow,
  getGoogleSheetsClient,
  readSheetValues,
} from '@/lib/googleSheets';
import {
  SAIDAS_SHEET_COLUMNS,
  SAIDAS_SHEET_CONFIG,
  SaidasQuantidadeColumns,
} from '@/config/saidas';
import {
  NovaSaidaPayload,
  SaidaMetaPayload,
  SaidaQuantidade,
  SaidaRealizadoPayload,
  SaidaSheetRecord,
} from '@/domain/types/saidas';

type PhotoPayload = {
  url?: string;
  id?: string;
};

const FULL_RANGE = `A:Q`;

export class SaidasSheetManager {
  private readonly spreadsheetId: string;
  private readonly tabName: string;

  constructor() {
    this.spreadsheetId = SAIDAS_SHEET_CONFIG.destino.spreadsheetId;
    this.tabName = SAIDAS_SHEET_CONFIG.destino.tabName;
  }

  public async listByDate(dateISO: string): Promise<SaidaSheetRecord[]> {
    const rows = await readSheetValues(
      this.spreadsheetId,
      `${this.tabName}!${FULL_RANGE}`,
    );
    const dataRows = rows.slice(1);

    return dataRows
      .map((row, index) => this.mapRow(row, index + 2))
      .filter((record): record is SaidaSheetRecord => {
        if (!record) return false;
        if (!dateISO) return true;
        return record.data === dateISO;
      });
  }

  public async getRow(rowNumber: number): Promise<SaidaSheetRecord | null> {
    const rows = await readSheetValues(
      this.spreadsheetId,
      `${this.tabName}!${FULL_RANGE}`,
    );
    const dataRow = rows[rowNumber - 1];
    if (!dataRow) return null;
    return this.mapRow(dataRow, rowNumber);
  }

  public async appendMeta(
    payload: SaidaMetaPayload,
    realizedOverride?: SaidaQuantidade,
  ): Promise<void> {
    const now = new Date().toISOString();
    const metaValues = this.toQuantityArray(payload.meta);
    const realizedValues = realizedOverride
      ? this.toQuantityArray(realizedOverride)
      : ['', '', '', ''];
    const saidaUpdatedAt = realizedOverride ? now : '';

    await appendRow(this.spreadsheetId, this.tabName, [
      payload.data,
      payload.cliente,
      payload.observacao || '',
      payload.produto,
      ...metaValues,
      now,
      now,
      ...realizedValues,
      saidaUpdatedAt,
      '',
      '',
    ]);
  }

  public async appendNovaSaida(payload: NovaSaidaPayload): Promise<void> {
    await this.appendMeta(
      {
        data: payload.data,
        cliente: payload.cliente,
        produto: payload.produto,
        observacao: payload.observacao || '',
        meta: payload.meta,
      },
      payload.meta,
    );
  }

  public async updateMeta(
    rowNumber: number,
    payload: SaidaMetaPayload,
  ): Promise<void> {
    const sheets = await getGoogleSheetsClient();
    const range = `${this.tabName}!A${rowNumber}:Q${rowNumber}`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range,
    });
    const existingRow = response.data.values?.[0];

    const createdAt =
      existingRow?.[SAIDAS_SHEET_COLUMNS.createdAt] ||
      new Date().toISOString();
    const saidaUpdatedAt =
      existingRow?.[SAIDAS_SHEET_COLUMNS.saidaUpdatedAt] || '';
    const photoUrl =
      existingRow?.[SAIDAS_SHEET_COLUMNS.fotoUrl] || '';
    const photoId =
      existingRow?.[SAIDAS_SHEET_COLUMNS.fotoId] || '';
    const realizedValues = this.extractRealizadoArray(existingRow);

    const now = new Date().toISOString();
    const metaValues = this.toQuantityArray(payload.meta);

    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            payload.data,
            payload.cliente,
            payload.observacao || '',
            payload.produto,
            ...metaValues,
            createdAt,
            now,
            ...realizedValues,
            saidaUpdatedAt,
            photoUrl,
            photoId,
          ],
        ],
      },
    });
  }

  public async deleteRow(rowNumber: number): Promise<void> {
    const sheets = await getGoogleSheetsClient();
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });
    const sheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === this.tabName,
    );

    if (!sheet?.properties?.sheetId) {
      throw new Error(`Aba "${this.tabName}" não encontrada`);
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });
  }

  public async updateRealizado(
    payload: SaidaRealizadoPayload,
    photo?: PhotoPayload,
  ): Promise<void> {
    const existingRow = await this.getRow(payload.rowIndex);
    const sheets = await getGoogleSheetsClient();
    const now = new Date().toISOString();
    const range = `${this.tabName}!K${payload.rowIndex}:Q${payload.rowIndex}`;
    const realizedValues = this.toQuantityArray(payload.realizado);

    const fotoUrl = photo?.url ?? existingRow?.fotoUrl ?? '';
    const fotoId = photo?.id ?? existingRow?.fotoId ?? '';

    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            ...realizedValues,
            now,
            fotoUrl,
            fotoId,
          ],
        ],
      },
    });
  }

  private mapRow(row: string[], rowNumber: number): SaidaSheetRecord | null {
    const dataISO = this.normalizeToISODate(
      row[SAIDAS_SHEET_COLUMNS.data],
    );
    const cliente = (row[SAIDAS_SHEET_COLUMNS.cliente] || '').toString().trim();
    const produto = (row[SAIDAS_SHEET_COLUMNS.produto] || '').toString().trim();

    if (!dataISO || !cliente || !produto) return null;

    return {
      rowIndex: rowNumber,
      data: dataISO,
      cliente,
      observacao: (row[SAIDAS_SHEET_COLUMNS.observacao] || '').toString(),
      produto,
      meta: this.parseQuantidade(row, SAIDAS_SHEET_COLUMNS.meta),
      realizado: this.parseQuantidade(row, SAIDAS_SHEET_COLUMNS.realizado),
      createdAt: row[SAIDAS_SHEET_COLUMNS.createdAt] || '',
      updatedAt: row[SAIDAS_SHEET_COLUMNS.updatedAt] || '',
      saidaUpdatedAt: row[SAIDAS_SHEET_COLUMNS.saidaUpdatedAt] || '',
      fotoUrl: row[SAIDAS_SHEET_COLUMNS.fotoUrl] || '',
      fotoId: row[SAIDAS_SHEET_COLUMNS.fotoId] || '',
    };
  }

  private parseQuantidade(
    row: string[],
    columns: SaidasQuantidadeColumns,
  ): SaidaQuantidade {
    return {
      caixas: this.toNumber(row[columns.caixas]),
      pacotes: this.toNumber(row[columns.pacotes]),
      unidades: this.toNumber(row[columns.unidades]),
      kg: this.toNumber(row[columns.kg]),
    };
  }

  private toQuantityArray(quantity: SaidaQuantidade): (string | number)[] {
    return [
      quantity.caixas || 0,
      quantity.pacotes || 0,
      quantity.unidades || 0,
      quantity.kg || 0,
    ];
  }

  private extractRealizadoArray(row?: string[]): (string | number)[] {
    if (!row) return ['', '', '', ''];
    const realized = this.parseQuantidade(row, SAIDAS_SHEET_COLUMNS.realizado);
    return this.toQuantityArray(realized);
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value || 0);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private normalizeToISODate(value: unknown): string {
    if (value == null) return '';
    const str = value.toString().trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.slice(0, 10);
    }

    const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
      const [, dd, mm, yyyy] = brMatch;
      return `${yyyy}-${mm}-${dd}`;
    }

    const date = new Date(str);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }

    return '';
  }
}

export const saidasSheetManager = new SaidasSheetManager();


