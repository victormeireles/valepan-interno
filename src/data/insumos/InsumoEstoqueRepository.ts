import { SupabaseClient } from '@supabase/supabase-js';
import type {
  InsumoMovimentoRecord,
  InsumoMovimentoOrigem,
  InsumoSaldoComDetalhes,
} from '@/domain/types/insumo-estoque';
import type {
  InsumoMovimentoRow,
  InsumoSaldoRow,
  RegistrarInsumoMovimentoInput,
} from '@/domain/types/insumo-estoque-db';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

type SaldoWithInsumo = InsumoSaldoRow & {
  insumos: {
    nome: string;
    custo_unitario: number;
    unidades: { nome_resumido: string } | { nome_resumido: string }[] | null;
  } | null;
};

const ENTRADA_ORIGENS: InsumoMovimentoOrigem[] = ['entrada_nf', 'resolucao_pendencia'];

export type InsumoMovimentoLoteColuna =
  | 'fermentacao_lote_id'
  | 'forno_lote_id'
  | 'embalagem_lote_id';

export class InsumoEstoqueRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  async findSaldo(insumoId: string): Promise<InsumoSaldoRow | null> {
    const { data, error } = await this.db
      .from('insumo_saldos')
      .select('*')
      .eq('insumo_id', insumoId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar saldo de insumo: ${error.message}`);
    }

    return data as InsumoSaldoRow | null;
  }

  async upsertSaldo(insumoId: string, quantidade: number): Promise<InsumoSaldoRow> {
    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from('insumo_saldos')
      .upsert(
        {
          insumo_id: insumoId,
          quantidade,
          updated_at: now,
        },
        { onConflict: 'insumo_id' },
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar saldo de insumo: ${error.message}`);
    }

    return data as InsumoSaldoRow;
  }

  async insertMovimento(input: RegistrarInsumoMovimentoInput): Promise<InsumoMovimentoRow> {
    const { data, error } = await this.db
      .from('insumo_movimentos')
      .insert({
        insumo_id: input.insumoId,
        empresa_id: input.empresaId ?? null,
        delta_quantidade: input.deltaQuantidade,
        saldo_resultante: input.saldoResultante,
        custo_unitario: input.custoUnitario,
        origem: input.origem,
        omie_n_id_receb: input.omieNIdReceb ?? null,
        omie_n_id_item: input.omieNIdItem ?? null,
        omie_webhook_evento_id: input.omieWebhookEventoId ?? null,
        pendencia_id: input.pendenciaId ?? null,
        numero_nf: input.numeroNf ?? null,
        observacao: input.observacao ?? null,
        fermentacao_lote_id: input.fermentacaoLoteId ?? null,
        forno_lote_id: input.fornoLoteId ?? null,
        embalagem_lote_id: input.embalagemLoteId ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao registrar movimento de insumo: ${error.message}`);
    }

    return data as InsumoMovimentoRow;
  }

  async listSaldosComDetalhes(): Promise<InsumoSaldoComDetalhes[]> {
    const { data, error } = await this.db
      .from('insumo_saldos')
      .select(
        'insumo_id, quantidade, updated_at, insumos(nome, custo_unitario, unidades(nome_resumido))',
      );

    if (error) {
      throw new Error(`Erro ao listar saldos de insumos: ${error.message}`);
    }

    const saldos = (data ?? []) as unknown as SaldoWithInsumo[];
    const ultimasEntradas = await this.fetchUltimasEntradasPorInsumo(
      saldos.map((row) => row.insumo_id),
    );

    return saldos
      .map((row) => {
        const unidades = row.insumos?.unidades;
        const unidadeResumida = Array.isArray(unidades)
          ? unidades[0]?.nome_resumido ?? ''
          : unidades?.nome_resumido ?? '';

        return {
          insumoId: row.insumo_id,
          nome: row.insumos?.nome ?? '',
          unidadeResumida,
          quantidade: Number(row.quantidade),
          custoUnitario: Number(row.insumos?.custo_unitario ?? 0),
          ultimaEntradaEm: ultimasEntradas.get(row.insumo_id) ?? null,
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async listInsumoIdsComMovimentoPendencia(): Promise<string[]> {
    const { data, error } = await this.db
      .from('insumo_movimentos')
      .select('insumo_id')
      .in('origem', ENTRADA_ORIGENS)
      .not('pendencia_id', 'is', null);

    if (error) {
      throw new Error(`Erro ao listar insumos com pendência vinculada: ${error.message}`);
    }

    return [...new Set((data ?? []).map((row) => row.insumo_id as string))];
  }

  async listMovimentos(insumoId: string, limit = 100): Promise<InsumoMovimentoRecord[]> {
    const { data, error } = await this.db
      .from('insumo_movimentos')
      .select('*')
      .eq('insumo_id', insumoId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao listar movimentos de insumo: ${error.message}`);
    }

    return (data as InsumoMovimentoRow[] ?? []).map((row) => this.mapMovimento(row));
  }

  async listMovimentosCronologicos(insumoId: string): Promise<InsumoMovimentoRow[]> {
    const { data, error } = await this.db
      .from('insumo_movimentos')
      .select('*')
      .eq('insumo_id', insumoId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar movimentos cronológicos: ${error.message}`);
    }

    return (data ?? []) as InsumoMovimentoRow[];
  }

  async updateMovimentoCorrecao(
    movimentoId: string,
    input: {
      deltaQuantidade: number;
      custoUnitario: number;
      saldoResultante: number;
    },
  ): Promise<void> {
    const { error } = await this.db
      .from('insumo_movimentos')
      .update({
        delta_quantidade: input.deltaQuantidade,
        custo_unitario: input.custoUnitario,
        saldo_resultante: input.saldoResultante,
      })
      .eq('id', movimentoId);

    if (error) {
      throw new Error(`Erro ao corrigir movimento de insumo: ${error.message}`);
    }
  }

  async listEntradasNfSemNumero(): Promise<
    { id: string; empresaId: string | null; nIdReceb: number }[]
  > {
    const { data, error } = await this.db
      .from('insumo_movimentos')
      .select('id, empresa_id, omie_n_id_receb')
      .eq('origem', 'entrada_nf')
      .is('numero_nf', null)
      .not('omie_n_id_receb', 'is', null);

    if (error) {
      throw new Error(`Erro ao listar entradas sem número de NF: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      empresaId: (row.empresa_id as string | null) ?? null,
      nIdReceb: row.omie_n_id_receb as number,
    }));
  }

  async setNumeroNfPorIds(ids: string[], numeroNf: string): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const { error } = await this.db
      .from('insumo_movimentos')
      .update({ numero_nf: numeroNf })
      .in('id', ids);

    if (error) {
      throw new Error(`Erro ao atualizar número de NF dos movimentos: ${error.message}`);
    }
  }

  async movimentoEntradaJaExiste(
    empresaId: string,
    nIdReceb: number,
    nIdItem: number,
  ): Promise<boolean> {
    const { data, error } = await this.db
      .from('insumo_movimentos')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('omie_n_id_receb', nIdReceb)
      .eq('omie_n_id_item', nIdItem)
      .eq('origem', 'entrada_nf')
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao verificar idempotência de entrada: ${error.message}`);
    }

    return data !== null;
  }

  async sumDeltaByLoteInsumo(
    coluna: InsumoMovimentoLoteColuna,
    loteId: string,
  ): Promise<Map<string, number>> {
    const { data, error } = await this.db
      .from('insumo_movimentos')
      .select('insumo_id, delta_quantidade')
      .eq(coluna, loteId);

    if (error) {
      throw new Error(`Erro ao agregar movimentos do lote: ${error.message}`);
    }

    const map = new Map<string, number>();
    for (const row of data ?? []) {
      const insumoId = row.insumo_id as string;
      map.set(insumoId, (map.get(insumoId) ?? 0) + Number(row.delta_quantidade));
    }
    return map;
  }

  async clearLoteId(coluna: InsumoMovimentoLoteColuna, loteId: string): Promise<void> {
    const { error } = await this.db
      .from('insumo_movimentos')
      .update({ [coluna]: null })
      .eq(coluna, loteId);

    if (error) {
      throw new Error(`Erro ao limpar vínculo do lote: ${error.message}`);
    }
  }

  async sumDeltaByFermentacaoLoteInsumo(
    fermentacaoLoteId: string,
  ): Promise<Map<string, number>> {
    return this.sumDeltaByLoteInsumo('fermentacao_lote_id', fermentacaoLoteId);
  }

  async clearFermentacaoLoteId(fermentacaoLoteId: string): Promise<void> {
    return this.clearLoteId('fermentacao_lote_id', fermentacaoLoteId);
  }

  async updateInsumoCustoUnitario(insumoId: string, custoUnitario: number): Promise<void> {
    const { error } = await this.supabase
      .from('insumos')
      .update({
        custo_unitario: custoUnitario,
        updated_at: new Date().toISOString(),
      })
      .eq('id', insumoId);

    if (error) {
      throw new Error(`Erro ao atualizar custo unitário do insumo: ${error.message}`);
    }
  }

  async findInsumoCustoUnitario(insumoId: string): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('insumos')
      .select('custo_unitario')
      .eq('id', insumoId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar custo do insumo: ${error.message}`);
    }

    if (data?.custo_unitario == null) return null;
    return Number(data.custo_unitario);
  }

  private async fetchUltimasEntradasPorInsumo(
    insumoIds: string[],
  ): Promise<Map<string, string>> {
    const resultado = new Map<string, string>();
    if (insumoIds.length === 0) {
      return resultado;
    }

    const { data, error } = await this.db
      .from('insumo_movimentos')
      .select('insumo_id, created_at')
      .in('insumo_id', insumoIds)
      .in('origem', ENTRADA_ORIGENS)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar últimas entradas: ${error.message}`);
    }

    for (const row of data ?? []) {
      const insumoId = row.insumo_id as string;
      if (!resultado.has(insumoId)) {
        resultado.set(insumoId, row.created_at as string);
      }
    }

    return resultado;
  }

  private mapMovimento(row: InsumoMovimentoRow): InsumoMovimentoRecord {
    return {
      id: row.id,
      createdAt: row.created_at,
      insumoId: row.insumo_id,
      deltaQuantidade: Number(row.delta_quantidade),
      saldoResultante: Number(row.saldo_resultante),
      custoUnitario: Number(row.custo_unitario),
      origem: row.origem,
      numeroNf: row.numero_nf,
      observacao: row.observacao,
    };
  }
}

export const insumoEstoqueRepository = new InsumoEstoqueRepository();
