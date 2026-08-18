import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { EstimativaProdutividadeMensal } from '@/domain/estimativa-producao/estimativa-producao-types';

type MetasProdutividadeRow = {
  ano_mes: string;
  produtividade_assadeiras_hora_producao: number | string | null;
  produtividade_assadeiras_hora_forno: number | string | null;
  produtividade_caixas_hora_embalagem: number | string | null;
};

function toRate(value: number | string | null): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class MetasMensaisProdutividadeRepository {
  private get supabase() {
    return supabaseClientFactory.createServiceRoleClient();
  }

  async listAll(): Promise<EstimativaProdutividadeMensal[]> {
    const { data, error } = await this.supabase
      .from('metas_mensais')
      .select(
        'ano_mes, produtividade_assadeiras_hora_producao, produtividade_assadeiras_hora_forno, produtividade_caixas_hora_embalagem',
      )
      .order('ano_mes', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar produtividade mensal: ${error.message}`);
    }

    return ((data ?? []) as MetasProdutividadeRow[]).map((row) => ({
      anoMes: row.ano_mes,
      taxaAssadeirasHoraProducao: toRate(row.produtividade_assadeiras_hora_producao),
      taxaAssadeirasHoraForno: toRate(row.produtividade_assadeiras_hora_forno),
      taxaCaixasHoraEmbalagem: toRate(row.produtividade_caixas_hora_embalagem),
    }));
  }
}

export const metasMensaisProdutividadeRepository = new MetasMensaisProdutividadeRepository();
