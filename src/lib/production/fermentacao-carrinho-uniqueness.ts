import type { FermentacaoQualityData, ProductionStepLog } from '@/domain/types/producao-etapas';

/** Comparação estável: trim, minúsculas e sem espaços internos ("12" = " 12 " = "1 2" não — "1 2" vira "12"). */
export function normalizeNumeroCarrinhoFermentacao(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
  return s.toLowerCase().replace(/\s+/g, '');
}

export function numeroCarrinhoFermentacaoFromDq(dq: unknown): string | null {
  if (dq == null || typeof dq !== 'object') return null;
  const n = (dq as FermentacaoQualityData).numero_carrinho;
  const norm = normalizeNumeroCarrinhoFermentacao(n);
  return norm.length > 0 ? norm : null;
}

/**
 * Garante que não exista outro log de fermentação na mesma ordem com o mesmo número de carrinho.
 * O log `excludeLogId` é ignorado (o próprio registo em edição/conclusão).
 */
export function assertCarrinhoFermentacaoUnicoNaOrdem(
  ordemLogs: ProductionStepLog[],
  excludeLogId: string,
  numeroNormalizado: string,
  /** Texto para a mensagem (ex.: valor digitado com trim). */
  numeroParaExibir: string,
): { ok: true } | { ok: false; error: string } {
  if (!numeroNormalizado) return { ok: true };

  for (const other of ordemLogs) {
    if (other.id === excludeLogId) continue;
    if (other.etapa !== 'fermentacao') continue;
    const existing = numeroCarrinhoFermentacaoFromDq(other.dados_qualidade);
    if (existing == null) continue;
    if (existing === numeroNormalizado) {
      const label = numeroParaExibir.trim() || numeroNormalizado;
      return {
        ok: false,
        error: `Já existe um carrinho com o número "${label}" nesta ordem de produção. Use outro número.`,
      };
    }
  }

  return { ok: true };
}
