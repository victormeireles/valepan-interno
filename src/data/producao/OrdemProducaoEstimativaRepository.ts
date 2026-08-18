import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { estimativaProducaoMapper } from '@/domain/estimativa-producao/estimativa-producao-mapper';
import type {
  EstimativaPersistRow,
  EstimativaProducaoRow,
} from '@/domain/estimativa-producao/estimativa-producao-types';
import { extractCalendarDate } from '@/lib/utils/date-utils';

export class OrdemProducaoEstimativaRepository {
  private get supabase() {
    return supabaseClientFactory.createServiceRoleClient();
  }

  async replaceForOrdens(
    ordemIds: string[],
    rows: EstimativaPersistRow[],
  ): Promise<void> {
    if (rows.length > 0) {
      const { error } = await this.supabase
        .from('ordens_producao_estimativa')
        .upsert(rows.map((row) => estimativaProducaoMapper.toInsert(row)), {
          onConflict: 'ordem_producao_id',
        });

      if (error) {
        throw new Error(`Erro ao gravar estimativa de produção: ${error.message}`);
      }
    }

    const keepIds = new Set(rows.map((row) => row.ordemProducaoId));
    const staleIds = ordemIds.filter((id) => !keepIds.has(id));
    await this.deleteForOrdemIds(staleIds);
  }

  async deleteForOrdemIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await this.supabase
      .from('ordens_producao_estimativa')
      .delete()
      .in('ordem_producao_id', ids);

    if (error) {
      throw new Error(`Erro ao limpar estimativa de produção: ${error.message}`);
    }
  }

  async listByOrdemIds(ids: string[]): Promise<EstimativaProducaoRow[]> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return [];

    const { data, error } = await this.supabase
      .from('ordens_producao_estimativa')
      .select()
      .in('ordem_producao_id', unique);

    if (error) {
      throw new Error(`Erro ao listar estimativa de produção: ${error.message}`);
    }

    return (data ?? []).map((row) => estimativaProducaoMapper.toHorarios(row));
  }

  async listDataProducaoFrom(fromDate: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('ordens_producao')
      .select('data_producao')
      .gte('data_producao', fromDate);

    if (error) {
      throw new Error(`Erro ao listar datas de produção: ${error.message}`);
    }

    const unique = new Set(
      (data ?? []).map((row) => extractCalendarDate(row.data_producao)).filter(Boolean),
    );
    return [...unique].sort();
  }
}

export const ordemProducaoEstimativaRepository = new OrdemProducaoEstimativaRepository();
