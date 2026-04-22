import type {
  FornoQualityData,
  ProductionStepLog,
  SaidaFornoQualityData,
} from '@/domain/types/producao-etapas';

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
    const dq = l.dados_qualidade as SaidaFornoQualityData | null;
    const b = dq?.bandejas;
    if (b != null && !Number.isNaN(Number(b))) s += Number(b);
  }
  return s;
}
