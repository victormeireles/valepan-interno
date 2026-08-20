import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type {
  ProducaoTurnoAtivo,
  ProducaoTurnoEtapaId,
  ProducaoTurnoNumero,
} from '@/domain/producao-turno/producao-turno-types';
import type { Database } from '@/types/database';

type AtivoRow = Database['public']['Tables']['producao_turno_ativo']['Row'];

export type ProducaoTurnoAtivoUpsert = {
  etapa: ProducaoTurnoEtapaId;
  numero: ProducaoTurnoNumero;
  confirmadoEm: string;
};

export class ProducaoTurnoAtivoRepository {
  private get supabase() {
    return supabaseClientFactory.createServiceRoleClient();
  }

  async findByEtapa(etapa: ProducaoTurnoEtapaId): Promise<ProducaoTurnoAtivo | null> {
    const { data, error } = await this.supabase
      .from('producao_turno_ativo')
      .select('numero, confirmado_em')
      .eq('etapa', etapa)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar turno ativo: ${error.message}`);
    }
    if (!data) return null;
    return fromDbRow(data);
  }

  async upsert(input: ProducaoTurnoAtivoUpsert): Promise<void> {
    const { error } = await this.supabase.from('producao_turno_ativo').upsert({
      etapa: input.etapa,
      numero: input.numero,
      confirmado_em: input.confirmadoEm,
    });

    if (error) {
      throw new Error(`Erro ao confirmar turno ativo: ${error.message}`);
    }
  }
}

function fromDbRow(row: Pick<AtivoRow, 'numero' | 'confirmado_em'>): ProducaoTurnoAtivo | null {
  if (!isTurnoNumero(row.numero)) return null;
  return { numero: row.numero, confirmadoEm: row.confirmado_em };
}

function isTurnoNumero(value: number): value is ProducaoTurnoNumero {
  return value === 1 || value === 2 || value === 3;
}

export const producaoTurnoAtivoRepository = new ProducaoTurnoAtivoRepository();
