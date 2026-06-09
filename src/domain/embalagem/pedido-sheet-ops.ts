import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import { keysEqual, normalizeObservacao } from '@/domain/embalagem/pedido-key';
import { rowToPedidoQuantidade } from '@/domain/embalagem/map-sheet-rows-to-pedidos';
import { quantidadeTemSaldoPedido } from '@/domain/embalagem/painel-quantidade';
import { PEDIDO_SHEET_COL } from '@/domain/embalagem/pedido-sheet-cols';
import type { PedidoEmbalagemKey, PedidoEmbalagemRecord } from '@/domain/types/pedido-embalagem';
import type { EmbalagemLoteFotos } from '@/domain/types/embalagem-lote';
import type { Quantidade } from '@/domain/types/inventario';
import { deleteSheetRow, getGoogleSheetsClient, readSheetValues } from '@/lib/googleSheets';
import type {
  ResolveAssadeira,
  ResolvePedidoIds,
} from '@/domain/embalagem/map-sheet-rows-to-pedidos';

function strictISODate(value: unknown): string {
  if (value == null) return '';
  const str = value.toString().trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  const dt = new Date(str);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return '';
}

export type SheetRowMatch = {
  rowNumber: number;
  row: (string | number)[];
  key: PedidoEmbalagemKey;
};

export type SheetRowLookupHints = {
  dataProducaoFilter?: string;
  dataFabricacaoEtiqueta?: string;
  observacao?: string;
  produtoNome?: string;
};

function normalizeNome(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR');
}

function createResolveIdsCache(resolveIds: ResolvePedidoIds) {
  const cache = new Map<string, { tipoEstoqueId: string; produtoId: string } | null>();

  return async (cliente: string, produto: string) => {
    const cacheKey = `${cliente}|${produto}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    try {
      const resolved = await resolveIds(cliente, produto);
      cache.set(cacheKey, resolved);
      return resolved;
    } catch {
      cache.set(cacheKey, null);
      return null;
    }
  };
}

function createResolveAssadeiraCache(resolveAssadeira: ResolveAssadeira) {
  const cache = new Map<string, { assadeiraId: string } | null>();

  return async (produtoId: string) => {
    if (cache.has(produtoId)) {
      return cache.get(produtoId);
    }
    try {
      const resolved = await resolveAssadeira({ produtoId });
      const value = { assadeiraId: resolved.assadeiraId };
      cache.set(produtoId, value);
      return value;
    } catch {
      cache.set(produtoId, null);
      return null;
    }
  };
}

export async function findSheetRowsForPedidoKey(
  pedidoKey: PedidoEmbalagemKey,
  resolveIds: ResolvePedidoIds,
  resolveAssadeira: ResolveAssadeira,
  hints?: SheetRowLookupHints,
): Promise<SheetRowMatch[]> {
  const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
  const sheetRows = await readSheetValues(spreadsheetId, `${tabName}!A:J`);
  const dataRows = sheetRows.slice(1);
  const matches: SheetRowMatch[] = [];
  const cachedResolveIds = createResolveIdsCache(resolveIds);
  const cachedResolveAssadeira = createResolveAssadeiraCache(resolveAssadeira);

  const produtoHint = hints?.produtoNome
    ? normalizeNome(hints.produtoNome)
    : null;
  const observacaoHint = hints?.observacao != null
    ? normalizeObservacao(hints.observacao)
    : null;
  const dataFabricacaoHint = hints?.dataFabricacaoEtiqueta;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2;
    const dataProducao = strictISODate(row[PEDIDO_SHEET_COL.dataProducao]);
    if (!dataProducao) continue;
    if (hints?.dataProducaoFilter && dataProducao !== hints.dataProducaoFilter) {
      continue;
    }

    const dataFabricacaoEtiqueta = strictISODate(
      row[PEDIDO_SHEET_COL.dataFabricacaoEtiqueta],
    );
    if (!dataFabricacaoEtiqueta) continue;
    if (dataFabricacaoHint && dataFabricacaoEtiqueta !== dataFabricacaoHint) {
      continue;
    }

    const observacao = normalizeObservacao(row[PEDIDO_SHEET_COL.observacao]);
    if (observacaoHint !== null && observacao !== observacaoHint) {
      continue;
    }

    const cliente = (row[PEDIDO_SHEET_COL.cliente] || '').toString().trim();
    const produto = (row[PEDIDO_SHEET_COL.produto] || '').toString().trim();
    if (!cliente || !produto) continue;
    if (produtoHint && normalizeNome(produto) !== produtoHint) {
      continue;
    }

    const resolved = await cachedResolveIds(cliente, produto);
    if (!resolved) continue;
    const assadeiraResolved = await cachedResolveAssadeira(resolved.produtoId);
    if (!assadeiraResolved) continue;

    const key: PedidoEmbalagemKey = {
      dataProducao,
      dataFabricacaoEtiqueta,
      tipoEstoqueId: resolved.tipoEstoqueId,
      produtoId: resolved.produtoId,
      observacao,
      assadeiraId: assadeiraResolved.assadeiraId,
    };

    if (keysEqual(key, pedidoKey)) {
      matches.push({ rowNumber, row, key });
    }
  }

  return matches.sort((a, b) => a.rowNumber - b.rowNumber);
}

export function pedidoRecordToKey(pedido: PedidoEmbalagemRecord): PedidoEmbalagemKey {
  return {
    dataProducao: pedido.dataProducao,
    dataFabricacaoEtiqueta: pedido.dataFabricacaoEtiqueta,
    tipoEstoqueId: pedido.tipoEstoqueId,
    produtoId: pedido.produtoId,
    observacao: pedido.observacao,
    assadeiraId: pedido.assadeiraId,
  };
}

/**
 * Busca linhas na planilha comparando nomes (cliente/produto) e chave do pedido já
 * conhecida no DB — evita resolveIds por linha (N queries Supabase).
 */
export async function findSheetRowsForPedidoRecord(
  pedido: PedidoEmbalagemRecord,
  clienteNome: string,
  produtoNome: string,
): Promise<SheetRowMatch[]> {
  const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
  const sheetRows = await readSheetValues(spreadsheetId, `${tabName}!A:J`);
  const dataRows = sheetRows.slice(1);
  const matches: SheetRowMatch[] = [];
  const key = pedidoRecordToKey(pedido);

  const clienteHint = normalizeNome(clienteNome);
  const produtoHint = normalizeNome(produtoNome);
  const observacaoHint = normalizeObservacao(pedido.observacao);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2;

    const dataProducao = strictISODate(row[PEDIDO_SHEET_COL.dataProducao]);
    if (dataProducao !== pedido.dataProducao) continue;

    const dataFabricacaoEtiqueta = strictISODate(
      row[PEDIDO_SHEET_COL.dataFabricacaoEtiqueta],
    );
    if (dataFabricacaoEtiqueta !== pedido.dataFabricacaoEtiqueta) continue;

    const observacao = normalizeObservacao(row[PEDIDO_SHEET_COL.observacao]);
    if (observacao !== observacaoHint) continue;

    const cliente = (row[PEDIDO_SHEET_COL.cliente] || '').toString().trim();
    const produto = (row[PEDIDO_SHEET_COL.produto] || '').toString().trim();
    if (!cliente || !produto) continue;
    if (normalizeNome(cliente) !== clienteHint) continue;
    if (normalizeNome(produto) !== produtoHint) continue;

    matches.push({ rowNumber, row, key });
  }

  return matches.sort((a, b) => a.rowNumber - b.rowNumber);
}

export async function resolveLinhaComSaldoParaPedido(
  pedido: PedidoEmbalagemRecord,
  resolveIds: ResolvePedidoIds,
  resolveAssadeira: ResolveAssadeira,
  hints?: Pick<SheetRowLookupHints, 'produtoNome'> & { clienteNome?: string },
): Promise<number | null> {
  const matches =
    hints?.clienteNome && hints?.produtoNome
      ? await findSheetRowsForPedidoRecord(pedido, hints.clienteNome, hints.produtoNome)
      : await findSheetRowsForPedidoKey(
          pedidoRecordToKey(pedido),
          resolveIds,
          resolveAssadeira,
          {
          dataProducaoFilter: pedido.dataProducao,
          dataFabricacaoEtiqueta: pedido.dataFabricacaoEtiqueta,
          observacao: pedido.observacao,
          produtoNome: hints?.produtoNome,
          },
        );

  for (const match of matches) {
    const q = rowToPedidoQuantidade(match.row);
    if (quantidadeTemSaldoPedido(q)) {
      return match.rowNumber;
    }
  }

  return null;
}

export async function deleteAllSheetRowsForPedido(
  pedido: PedidoEmbalagemRecord,
  resolveIds: ResolvePedidoIds,
  resolveAssadeira: ResolveAssadeira,
): Promise<number> {
  const key = pedidoRecordToKey(pedido);
  const matches = await findSheetRowsForPedidoKey(
    key,
    resolveIds,
    resolveAssadeira,
    {
      dataProducaoFilter: pedido.dataProducao,
      dataFabricacaoEtiqueta: pedido.dataFabricacaoEtiqueta,
      observacao: pedido.observacao,
    },
  );

  const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
  const rowNumbers = matches.map((m) => m.rowNumber).sort((a, b) => b - a);

  for (const rowNumber of rowNumbers) {
    await deleteSheetRow(spreadsheetId, tabName, rowNumber);
  }

  return rowNumbers.length;
}

/** Append de uma linha de produção (dual-write legado). Retorna o número da linha criada. */
export async function appendEmbalagemProducaoRow(params: {
  dataPedido: string;
  dataFabricacao: string;
  cliente: string;
  observacao: string;
  produto: string;
  congelado: string;
  quantidade: Quantidade;
  obsEmbalagem?: string;
  fotos?: EmbalagemLoteFotos;
}): Promise<number> {
  const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
  const sheets = await getGoogleSheetsClient();
  const now = new Date().toISOString();
  const c = params.quantidade.caixas;
  const p = params.quantidade.pacotes;
  const u = params.quantidade.unidades;
  const k = params.quantidade.kg;
  const fotos = params.fotos;

  const novaLinhaValues = [
    params.dataPedido,
    params.dataFabricacao,
    params.cliente,
    params.observacao,
    params.produto,
    params.congelado,
    c,
    p,
    u,
    k,
    now,
    now,
    c,
    p,
    u,
    k,
    now,
    fotos?.pacoteFotoUrl || '',
    fotos?.pacoteFotoId || '',
    fotos?.pacoteFotoUploadedAt || '',
    fotos?.etiquetaFotoUrl || '',
    fotos?.etiquetaFotoId || '',
    fotos?.etiquetaFotoUploadedAt || '',
    fotos?.palletFotoUrl || '',
    fotos?.palletFotoId || '',
    fotos?.palletFotoUploadedAt || '',
    '',
    '',
    params.obsEmbalagem || '',
  ];

  const appendResponse = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [novaLinhaValues] },
  });

  const updatedRange = appendResponse.data.updates?.updatedRange || '';
  const match = updatedRange.match(/!A(\d+):/);
  const rowNumber = match ? parseInt(match[1], 10) : NaN;
  if (!Number.isFinite(rowNumber) || rowNumber < 2) {
    throw new Error('Não foi possível determinar a linha criada na planilha');
  }
  return rowNumber;
}
