import { normalizeObservacao } from '@/domain/embalagem/pedido-key';

export type MetaEmbalagemBatchRow = {
  linha: number;
  dataProducao: string;
  dataEtiqueta: string;
  tipoEstoque: string;
  produto: string;
  latas: number;
  assadeira: string;
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

const FORMAT_HINT =
  'data produção;tipo estoque;produto;latas/un;assadeira;data etiqueta;observação';

function splitBatchColumns(parts: string[]): {
  qtyRaw: string;
  assadeira: string;
  dataEtiqueta: string;
  observacao: string;
} {
  const qtyRaw = parts[3] ?? '';

  if (parts.length >= 7) {
    return {
      qtyRaw,
      assadeira: parts[4].trim(),
      dataEtiqueta: parts[5].trim(),
      observacao: normalizeObservacao(parts.slice(6).join(';')),
    };
  }

  if (parts.length >= 6) {
    const col4 = parts[4].trim();
    const col5 = parts[5].trim();

    if (ISO_DATE.test(col4)) {
      return { qtyRaw, assadeira: '', dataEtiqueta: col4, observacao: normalizeObservacao(col5) };
    }
    if (ISO_DATE.test(col5) || col5 === '') {
      return { qtyRaw, assadeira: col4, dataEtiqueta: col5, observacao: '' };
    }
    if (col4 === '') {
      return { qtyRaw, assadeira: '', dataEtiqueta: '', observacao: normalizeObservacao(col5) };
    }
    return { qtyRaw, assadeira: col4, dataEtiqueta: '', observacao: normalizeObservacao(col5) };
  }

  return {
    qtyRaw,
    assadeira: '',
    dataEtiqueta: '',
    observacao: normalizeObservacao(parts.slice(4).join(';')),
  };
}

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
        erro: `Formato inválido — use: ${FORMAT_HINT}`,
      });
      continue;
    }

    const [dataProducao, tipoEstoque, produto] = parts;
    const { qtyRaw, assadeira, dataEtiqueta, observacao } = splitBatchColumns(parts);
    const resolvedDataEtiqueta = dataEtiqueta || dataProducao;

    if (!ISO_DATE.test(dataProducao)) {
      errors.push({ linha, texto: raw, erro: 'Data de produção inválida (use AAAA-MM-DD)' });
      continue;
    }
    if (dataEtiqueta && !ISO_DATE.test(dataEtiqueta)) {
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
      dataEtiqueta: resolvedDataEtiqueta,
      tipoEstoque,
      produto,
      latas,
      assadeira,
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
        erro: 'Chave duplicada no lote — mesma combinação de datas, estoque, produto, assadeira e observação',
      });
    }
  }

  return { rows, errors };
}

export function metaEmbalagemBatchRowKey(row: Pick<
  MetaEmbalagemBatchRow,
  'dataProducao' | 'dataEtiqueta' | 'tipoEstoque' | 'produto' | 'assadeira' | 'observacao'
>): string {
  return [
    row.dataProducao,
    row.dataEtiqueta,
    row.tipoEstoque.toLocaleLowerCase('pt-BR'),
    row.produto.toLocaleLowerCase('pt-BR'),
    row.assadeira.toLocaleLowerCase('pt-BR'),
    row.observacao,
  ].join('|');
}

export { FORMAT_HINT as META_EMBALAGEM_BATCH_FORMAT_HINT };
