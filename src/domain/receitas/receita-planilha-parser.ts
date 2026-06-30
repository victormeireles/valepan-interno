import { normalizeInsumoDescricao } from '@/domain/insumos/insumo-ignorar-keywords';
import type { ReceitaPlanilhaLinhaParseada } from './receita-planilha-types';

const HEADER_TOKENS = new Set(['INGREDIENTE', 'INSUMO', 'QUANTIDADE', 'QTD']);

function isHeaderLine(line: string): boolean {
  const normalized = normalizeInsumoDescricao(line.trim());
  const first = normalized.split(' ')[0] ?? '';
  return HEADER_TOKENS.has(first);
}

function parseQuantidade(raw: string): number | null {
  const trimmed = raw.trim();
  const hasComma = trimmed.includes(',');
  const hasDot = trimmed.includes('.');

  let cleaned: string;
  if (hasComma && hasDot) {
    cleaned = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    cleaned = trimmed.replace(',', '.');
  } else {
    cleaned = trimmed;
  }

  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function splitLinha(line: string): { nome: string; qtdRaw: string } | null {
  const tabIdx = line.indexOf('\t');
  if (tabIdx >= 0) {
    return {
      nome: line.slice(0, tabIdx).trim(),
      qtdRaw: line.slice(tabIdx + 1).trim(),
    };
  }
  const match = line.match(/^(.+?)\s{2,}(.+)$/);
  if (match) {
    return { nome: match[1].trim(), qtdRaw: match[2].trim() };
  }
  return null;
}

export function parseColagemPlanilha(text: string): ReceitaPlanilhaLinhaParseada[] {
  const linhas: ReceitaPlanilhaLinhaParseada[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || isHeaderLine(line)) continue;

    const parts = splitLinha(line);
    if (!parts || !parts.nome) continue;

    const quantidade = parseQuantidade(parts.qtdRaw);
    if (quantidade === null) continue;

    linhas.push({ nomeColado: parts.nome, quantidade });
  }

  if (linhas.length === 0) {
    throw new Error('Nenhuma linha válida encontrada. Use nome + tab + quantidade.');
  }

  return linhas;
}
