import { normalizeObservacao } from '@/domain/embalagem/pedido-key';

export type MetaEmbalagemBatchRow = {
  linha: number;
  dataProducao: string;
  dataEtiqueta: string;
  tipoEstoque: string;
  produto: string;
  latas: number;
  observacao: string;
};

export type MetaEmbalagemBatchParseError = {
  linha: number;
  texto: string;
  erro: string;
};

export type MetaEmbalagemBatchParseResult = {
  rows: MetaEmbalagemBatchRow[];
  errors: MetaEmbalagemBatchParseError[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseMetaEmbalagemBatchText(text: string): MetaEmbalagemBatchParseResult {
  const rows: MetaEmbalagemBatchRow[] = [];
  const errors: MetaEmbalagemBatchParseError[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const linha = i + 1;
    const raw = lines[i].trim();
    if (!raw || raw.startsWith('#') || raw.startsWith('//')) continue;

    const parts = raw.split(';').map((p) => p.trim());
    if (parts.length < 5) {
      errors.push({
        linha,
        texto: raw,
        erro: 'Formato inválido — use: data produção;data etiqueta;tipo estoque;produto;latas;observação',
      });
      continue;
    }

    const [dataProducao, dataEtiqueta, tipoEstoque, produto, qtyRaw, ...obsParts] = parts;
    const observacao = normalizeObservacao(obsParts.join(';'));

    if (!ISO_DATE.test(dataProducao)) {
      errors.push({ linha, texto: raw, erro: 'Data de produção inválida (use AAAA-MM-DD)' });
      continue;
    }
    if (!ISO_DATE.test(dataEtiqueta)) {
      errors.push({ linha, texto: raw, erro: 'Data de etiqueta inválida (use AAAA-MM-DD)' });
      continue;
    }
    if (!tipoEstoque) {
      errors.push({ linha, texto: raw, erro: 'Tipo de estoque é obrigatório' });
      continue;
    }
    if (!produto) {
      errors.push({ linha, texto: raw, erro: 'Produto é obrigatório' });
      continue;
    }

    const latas = Number(qtyRaw.replace(',', '.'));
    if (!Number.isFinite(latas) || latas < 0) {
      errors.push({ linha, texto: raw, erro: 'Quantidade inválida' });
      continue;
    }

    rows.push({
      linha,
      dataProducao,
      dataEtiqueta,
      tipoEstoque,
      produto,
      latas,
      observacao,
    });
  }

  const keyCounts = new Map<string, number>();
  for (const row of rows) {
    const key = metaEmbalagemBatchRowKey(row);
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }
  for (const row of rows) {
    const key = metaEmbalagemBatchRowKey(row);
    if ((keyCounts.get(key) ?? 0) > 1) {
      errors.push({
        linha: row.linha,
        texto: `${row.produto}`,
        erro: 'Chave duplicada no lote — mesma combinação de datas, estoque, produto e observação',
      });
    }
  }

  return { rows, errors };
}

export function metaEmbalagemBatchRowKey(row: Pick<
  MetaEmbalagemBatchRow,
  'dataProducao' | 'dataEtiqueta' | 'tipoEstoque' | 'produto' | 'observacao'
>): string {
  return [
    row.dataProducao,
    row.dataEtiqueta,
    row.tipoEstoque.toLocaleLowerCase('pt-BR'),
    row.produto.toLocaleLowerCase('pt-BR'),
    row.observacao,
  ].join('|');
}
