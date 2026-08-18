import type { Database } from '@/types/database';
import type {
  EstimativaPersistRow,
  EstimativaProducaoHorarios,
} from './estimativa-producao-types';

type EstimativaRow = Database['public']['Tables']['ordens_producao_estimativa']['Row'];
type EstimativaInsert = Database['public']['Tables']['ordens_producao_estimativa']['Insert'];

export class EstimativaProducaoMapper {
  toInsert(row: EstimativaPersistRow): EstimativaInsert {
    return {
      ordem_producao_id: row.ordemProducaoId,
      fermentacao_inicio_previsto: row.fermentacaoInicioPrevisto,
      fermentacao_fim_previsto: row.fermentacaoFimPrevisto,
      camara_fim_previsto: row.camaraFimPrevisto,
      forno_inicio_previsto: row.fornoInicioPrevisto,
      forno_fim_previsto: row.fornoFimPrevisto,
      resfriamento_fim_previsto: row.resfriamentoFimPrevisto,
      embalagem_inicio_previsto: row.embalagemInicioPrevisto,
      embalagem_fim_previsto: row.embalagemFimPrevisto,
      taxa_assadeiras_hora_producao: row.taxaAssadeirasHoraProducao,
      taxa_assadeiras_hora_forno: row.taxaAssadeirasHoraForno,
      taxa_caixas_hora_embalagem: row.taxaCaixasHoraEmbalagem,
      tempo_medio_fermentacao_min: row.tempoMedioFermentacaoMin,
      tempo_medio_resfriamento_min: row.tempoMedioResfriamentoMin,
    };
  }

  toHorarios(row: EstimativaRow): EstimativaProducaoHorarios & { ordemProducaoId: string } {
    return {
      ordemProducaoId: row.ordem_producao_id,
      fermentacaoInicioPrevisto: row.fermentacao_inicio_previsto,
      fermentacaoFimPrevisto: row.fermentacao_fim_previsto,
      camaraFimPrevisto: row.camara_fim_previsto,
      fornoInicioPrevisto: row.forno_inicio_previsto,
      fornoFimPrevisto: row.forno_fim_previsto,
      resfriamentoFimPrevisto: row.resfriamento_fim_previsto,
      embalagemInicioPrevisto: row.embalagem_inicio_previsto,
      embalagemFimPrevisto: row.embalagem_fim_previsto,
    };
  }
}

export const estimativaProducaoMapper = new EstimativaProducaoMapper();
