import type {
  FermentacaoQualityData,
  ProductionStepLog,
} from '@/domain/types/producao-etapas';

/**
 * Latas (LT) de um log de fermentação.
 * Fonte de verdade: `dados_qualidade.assadeiras_lt` (o que o operador digitou).
 * Só deriva de `qtd_saida` dividindo por unidades/lata quando LT não foi gravado (legado).
 */
export function ltFromFermentacaoLog(
  qtd_saida: number | null,
  dados_qualidade: unknown,
  unidadesPorAssadeira: number | null,
): number {
  const dq = dados_qualidade as FermentacaoQualityData | null;
  const ltRaw = dq?.assadeiras_lt;
  if (ltRaw != null && Number.isFinite(Number(ltRaw))) {
    const lt = Number(ltRaw);
    if (lt > 0) return lt;
  }

  const qs = qtd_saida;
  if (qs == null || !Number.isFinite(Number(qs)) || Number(qs) <= 0) return 0;

  if (unidadesPorAssadeira != null && unidadesPorAssadeira > 0) {
    return Number(qs) / unidadesPorAssadeira;
  }

  // Sem unidades por lata: valor legado em unidades (não multiplicar nem tratar como LT).
  return Number(qs);
}

/**
 * Soma fermentação concluída na unidade da meta:
 * - Com unidades/lata: LT via {@link ltFromFermentacaoLog}.
 * - Sem unidades/lata: prioriza assadeiras_lt; senão qtd_saida em unidades.
 */
export function sumQuantidadeFermentacaoConcluida(
  logs: ProductionStepLog[],
  unidadesPorAssadeira: number | null,
): number {
  let sum = 0;
  for (const log of logs) {
    if (log.etapa !== 'fermentacao' || log.fim == null) continue;

    if (unidadesPorAssadeira != null && unidadesPorAssadeira > 0) {
      sum += ltFromFermentacaoLog(log.qtd_saida, log.dados_qualidade, unidadesPorAssadeira);
      continue;
    }

    const dq = log.dados_qualidade as FermentacaoQualityData | null;
    const lt = dq?.assadeiras_lt;
    if (lt != null && Number.isFinite(Number(lt)) && Number(lt) > 0) {
      sum += Number(lt);
      continue;
    }
    const qs = log.qtd_saida;
    if (qs != null && !Number.isNaN(Number(qs))) {
      sum += Number(qs);
    }
  }
  return sum;
}
