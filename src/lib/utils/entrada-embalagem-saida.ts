import type { EmbalagemQualityData, ProductionStepLog, SaidaFornoQualityData } from '@/domain/types/producao-etapas';

/** Teto operacional por registro na entrada da embalagem. */
export const MAX_LATAS_ENTRADA_EMBALAGEM = 20;

/** Latas (LT) de um log de entrada na embalagem. */
export function latasFromEntradaEmbalagemLog(
  dados_qualidade: unknown,
  qtd_saida: number | null | undefined,
): number {
  const dq = dados_qualidade as EmbalagemQualityData | null;
  if (dq?.assadeiras != null && Number.isFinite(Number(dq.assadeiras)) && Number(dq.assadeiras) > 0) {
    return Math.round(Number(dq.assadeiras));
  }
  if (qtd_saida != null && Number.isFinite(Number(qtd_saida)) && Number(qtd_saida) > 0) {
    return Math.round(Number(qtd_saida));
  }
  return 0;
}

/** Máximo de LT editável neste registro (saldo da saída do forno vinculada). */
export function maxLatasEditaveisEntradaEmbalagemLog(
  logs: ProductionStepLog[],
  entradaLogId: string,
  saidaFornoLogId: string,
  saidaDq: SaidaFornoQualityData | null | undefined,
): number {
  const latasSaida = latasSaidaFornoDoLog(saidaDq);
  if (latasSaida <= 0) return MAX_LATAS_ENTRADA_EMBALAGEM;

  const entradaLog = logs.find((l) => l.id === entradaLogId);
  const oldLatas = entradaLog
    ? latasFromEntradaEmbalagemLog(entradaLog.dados_qualidade, entradaLog.qtd_saida)
    : 0;
  const consumidoTotal = sumLatasEntradaEmbalagemPorSaidaFornoLogId(logs, saidaFornoLogId);
  const consumidoOutros = consumidoTotal - oldLatas;
  const maxParaLog = latasSaida - consumidoOutros;
  return Math.min(MAX_LATAS_ENTRADA_EMBALAGEM, Math.max(0, maxParaLog));
}

/** Soma latas já registradas na entrada da embalagem vinculadas a um log de saída do forno. */
export function sumLatasEntradaEmbalagemPorSaidaFornoLogId(
  logs: ProductionStepLog[],
  saidaFornoLogId: string,
): number {
  let s = 0;
  for (const l of logs) {
    if (l.etapa !== 'entrada_embalagem' || l.fim == null) continue;
    const dq = l.dados_qualidade as EmbalagemQualityData | null;
    if (dq?.saida_forno_log_id !== saidaFornoLogId) continue;
    const lt = dq?.assadeiras;
    if (lt != null && Number.isFinite(Number(lt))) s += Number(lt);
  }
  return s;
}

export function latasSaidaFornoDoLog(dados: SaidaFornoQualityData | null | undefined): number {
  const b = dados?.bandejas;
  if (b == null || !Number.isFinite(Number(b))) return 0;
  return Math.max(0, Math.round(Number(b)));
}
