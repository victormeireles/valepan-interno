import type {
  FermentacaoQualityData,
  ProductionStepLog,
} from '@/domain/types/producao-etapas';

/**
 * Soma a quantidade já passada pela fermentação (logs concluídos), na mesma unidade da meta:
 * - Com unidades por assadeira: prioriza assadeiras_lt em dados_qualidade; senão qtd_saida / unidades_assadeira (LT).
 * - Sem assadeira: soma qtd_saida em unidades.
 */
export function sumQuantidadeFermentacaoConcluida(
  logs: ProductionStepLog[],
  unidadesPorAssadeira: number | null,
): number {
  let sum = 0;
  for (const log of logs) {
    if (log.etapa !== 'fermentacao' || log.fim == null) continue;

    if (unidadesPorAssadeira != null && unidadesPorAssadeira > 0) {
      const dq = log.dados_qualidade as FermentacaoQualityData | null;
      const lt = dq?.assadeiras_lt;
      if (lt != null && !Number.isNaN(Number(lt))) {
        sum += Number(lt);
        continue;
      }
      const qs = log.qtd_saida;
      if (qs != null && !Number.isNaN(Number(qs))) {
        sum += Number(qs) / unidadesPorAssadeira;
      }
    } else {
      const qs = log.qtd_saida;
      if (qs != null && !Number.isNaN(Number(qs))) {
        sum += Number(qs);
      }
    }
  }
  return sum;
}
