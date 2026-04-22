import type { EmbalagemQualityData, ProductionStepLog, SaidaFornoQualityData } from '@/domain/types/producao-etapas';

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
