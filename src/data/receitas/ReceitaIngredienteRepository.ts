import { SupabaseClient } from '@supabase/supabase-js';
import type { InsumoReceitaAssociacao } from '@/domain/receitas/insumo-receita-associacao';
import type { TipoReceita } from '@/domain/receitas/tipo-receita-labels';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

type ReceitaIngredienteRow = {
  id: string;
  insumo_id: string;
  quantidade_padrao: number;
  receitas: {
    id: string;
    nome: string;
    tipo: TipoReceita;
    ativo: boolean | null;
  } | null;
};

export class ReceitaIngredienteRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  private mapRow(row: ReceitaIngredienteRow): InsumoReceitaAssociacao | null {
    if (!row.receitas) return null;

    return {
      ingredienteId: row.id,
      receitaId: row.receitas.id,
      receitaNome: row.receitas.nome,
      receitaTipo: row.receitas.tipo,
      receitaAtiva: row.receitas.ativo !== false,
      quantidadePadrao: Number(row.quantidade_padrao),
    };
  }

  async listAssociacoesPorInsumo(insumoId: string): Promise<InsumoReceitaAssociacao[]> {
    const { data, error } = await this.db
      .from('receita_ingredientes')
      .select(`
        id,
        insumo_id,
        quantidade_padrao,
        receitas (
          id,
          nome,
          tipo,
          ativo
        )
      `)
      .eq('insumo_id', insumoId)
      .order('nome', { referencedTable: 'receitas', ascending: true });

    if (error) {
      throw new Error(`Erro ao listar receitas do insumo: ${error.message}`);
    }

    return (data as unknown as ReceitaIngredienteRow[] ?? [])
      .map((row) => this.mapRow(row))
      .filter((item): item is InsumoReceitaAssociacao => item !== null);
  }

  async listAssociacoesAgrupadasPorInsumo(): Promise<Record<string, InsumoReceitaAssociacao[]>> {
    const { data, error } = await this.db
      .from('receita_ingredientes')
      .select(`
        id,
        insumo_id,
        quantidade_padrao,
        receitas (
          id,
          nome,
          tipo,
          ativo
        )
      `);

    if (error) {
      throw new Error(`Erro ao listar associações insumo-receita: ${error.message}`);
    }

    const map: Record<string, InsumoReceitaAssociacao[]> = {};

    for (const row of (data as unknown as ReceitaIngredienteRow[] ?? [])) {
      const associacao = this.mapRow(row);
      if (!associacao) continue;

      const existing = map[row.insumo_id];
      if (existing) {
        existing.push(associacao);
        continue;
      }
      map[row.insumo_id] = [associacao];
    }

    for (const associacoes of Object.values(map)) {
      associacoes.sort((a, b) => a.receitaNome.localeCompare(b.receitaNome, 'pt-BR'));
    }

    return map;
  }
}

export const receitaIngredienteRepository = new ReceitaIngredienteRepository();
