import type {
  FornoQualityData,
  ProductionStepLog,
  SaidaFornoQualityData,
} from '@/domain/types/producao-etapas';

/** Teto operacional por carrinho na saída do forno (1 bandeja = 1 LT). */
export const MAX_BANDEJAS_SAIDA_FORNO = 20;

/** Bandejas (LT) de um log de saída do forno. */
export function bandejasFromSaidaFornoLog(dados_qualidade: unknown): number {
  const dq = dados_qualidade as SaidaFornoQualityData | null;
  const b = dq?.bandejas;
  if (b != null && Number.isFinite(Number(b)) && Number(b) > 0) {
    return Number(b);
  }
  return 0;
}

/** Soma latas registradas na entrada do forno (todos os logs etapa=entrada_forno com assadeiras_lt). */
export function sumLatasEntradaForno(logs: ProductionStepLog[]): number {
  let s = 0;
  for (const l of logs) {
    if (l.etapa !== 'entrada_forno') continue;
    const dq = l.dados_qualidade as FornoQualityData | null;
    const lt = dq?.assadeiras_lt;
    if (lt != null && !Number.isNaN(Number(lt))) s += Number(lt);
  }
  return s;
}

/** Soma bandejas registradas na saída do forno (logs concluídos); 1 bandeja conta como 1 LT na barra. */
export function sumBandejasSaidaFornoConcluida(logs: ProductionStepLog[]): number {
  let s = 0;
  for (const l of logs) {
    if (l.etapa !== 'saida_forno' || l.fim == null) continue;
    s += bandejasFromSaidaFornoLog(l.dados_qualidade);
  }
  return s;
}
