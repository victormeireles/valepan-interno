import type { ProductionStepLog } from '@/domain/types/producao-etapas';

function receitasFromMassaLog(log: ProductionStepLog): number {
  if (log.receitas_batidas != null && !Number.isNaN(Number(log.receitas_batidas))) {
    return Number(log.receitas_batidas);
  }
  const dq = log.dados_qualidade;
  if (dq && typeof dq === 'object' && 'receitas_batidas' in dq) {
    const r = (dq as { receitas_batidas?: unknown }).receitas_batidas;
    if (typeof r === 'number' && !Number.isNaN(r)) {
      return r;
    }
  }
  return 0;
}

/** Soma receitas batidas de todos os logs de massa da ordem (cada log pode ser um lote). */
export function sumReceitasBatidasFromMassaLogs(logs: ProductionStepLog[]): number {
  return logs
    .filter((log) => log.etapa === 'massa')
    .reduce((sum, log) => sum + receitasFromMassaLog(log), 0);
}
