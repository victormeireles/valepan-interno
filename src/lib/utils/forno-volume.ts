import type { FornoQualityData, ProductionStepLog } from '@/domain/types/producao-etapas';

/**
 * Soma de latas (LT) em ciclos de forno ainda abertos (fim null).
 * Usa assadeiras_lt em dados_qualidade; senão deriva de qtd_saida / unidades por assadeira.
 */
export function sumLatasFornoEmAndamento(
  logs: ProductionStepLog[],
  unidadesPorAssadeira: number | null,
): number {
  let sum = 0;
  for (const log of logs) {
    if (log.etapa !== 'entrada_forno' || log.fim != null) continue;
    const dq = log.dados_qualidade as FornoQualityData | null;
    const lt = dq?.assadeiras_lt;
    if (lt != null && !Number.isNaN(Number(lt)) && Number(lt) > 0) {
      sum += Number(lt);
      continue;
    }
    const qs = log.qtd_saida;
    if (unidadesPorAssadeira != null && unidadesPorAssadeira > 0 && qs != null && !Number.isNaN(Number(qs))) {
      sum += Number(qs) / unidadesPorAssadeira;
    } else if (qs != null && !Number.isNaN(Number(qs))) {
      sum += Number(qs);
    }
  }
  return sum;
}

/**
 * Volume já concluído no forno (logs com fim), em LT ou un (mesma regra da fermentação).
 */
export function sumQuantidadeFornoConcluida(
  logs: ProductionStepLog[],
  unidadesPorAssadeira: number | null,
): number {
  let sum = 0;
  for (const log of logs) {
    if (log.etapa !== 'entrada_forno' || log.fim == null) continue;
    const qs = log.qtd_saida;
    if (unidadesPorAssadeira != null && unidadesPorAssadeira > 0) {
      if (qs != null && !Number.isNaN(Number(qs))) {
        sum += Number(qs) / unidadesPorAssadeira;
      }
    } else if (qs != null && !Number.isNaN(Number(qs))) {
      sum += Number(qs);
    }
  }
  return sum;
}

/** Linhas de log etapa=entrada_forno (abertas ou fechadas): soma LT via assadeiras_lt ou qtd_saida/un. */
export function sumLatasFromFornoLogRows(
  logs: Array<{ dados_qualidade?: unknown; qtd_saida?: number | null }>,
  unidadesPorAssadeira: number | null,
): number {
  let sum = 0;
  for (const log of logs) {
    const dq = log.dados_qualidade as FornoQualityData | null;
    const lt = dq?.assadeiras_lt;
    if (lt != null && !Number.isNaN(Number(lt)) && Number(lt) > 0) {
      sum += Number(lt);
      continue;
    }
    const qs = log.qtd_saida;
    if (unidadesPorAssadeira != null && unidadesPorAssadeira > 0 && qs != null && !Number.isNaN(Number(qs))) {
      sum += Number(qs) / unidadesPorAssadeira;
    } else if (qs != null && !Number.isNaN(Number(qs))) {
      sum += Number(qs);
    }
  }
  return sum;
}
