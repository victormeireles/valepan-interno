import { FLUXO_PADRAO } from '@/domain/fluxo-processo/fluxo-processo-constants';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type FilasTempos = {
  camaraMin: number;
  resfrioMin: number;
};

type ConfigTemposRow = {
  tempo_medio_fermentacao_min?: number | null;
  tempo_medio_resfriamento_min?: number | null;
};

type ConfigTemposQuery = {
  from: (table: string) => {
    select: (columns: string) => {
      limit: (n: number) => {
        maybeSingle: () => Promise<{
          data: ConfigTemposRow | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

/** Lê tempos de câmara/resfriamento; ausentes caem em FLUXO_PADRAO. */
export class FluxoFilasTemposResolver {
  async resolve(): Promise<FilasTempos> {
    try {
      const client = supabaseClientFactory.createServiceRoleClient() as unknown as ConfigTemposQuery;
      const { data, error } = await client
        .from('config_operacao')
        .select('tempo_medio_fermentacao_min, tempo_medio_resfriamento_min')
        .limit(1)
        .maybeSingle();
      if (error || !data) return { ...FLUXO_PADRAO };
      return temposFromRow(data);
    } catch {
      return { ...FLUXO_PADRAO };
    }
  }
}

function temposFromRow(row: ConfigTemposRow): FilasTempos {
  return {
    camaraMin: row.tempo_medio_fermentacao_min ?? FLUXO_PADRAO.camaraMin,
    resfrioMin: row.tempo_medio_resfriamento_min ?? FLUXO_PADRAO.resfrioMin,
  };
}
