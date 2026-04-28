'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';
import type {
  EmbalagemQualityData,
  FermentacaoQualityData,
  FornoQualityData,
  SaidaFornoQualityData,
} from '@/domain/types/producao-etapas';
import { normalizeNumeroCarrinhoFermentacao } from '@/lib/production/fermentacao-carrinho-uniqueness';
import {
  latasSaidaFornoDoLog,
} from '@/lib/utils/entrada-embalagem-saida';

import type { Tables } from '@/types/database';

const PATH = '/carrinhos';

export type CarrinhoRow = Tables<'carrinhos'>;

export type CarrinhosLoadResult =
  | { ok: true; list: CarrinhoRow[] }
  | { ok: false; message: string };

export async function getCarrinhos(): Promise<CarrinhosLoadResult> {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase
    .from('carrinhos')
    .select('*')
    .order('numero', { ascending: true });

  if (error) {
    return {
      ok: false,
      message: error.message || 'Erro ao carregar carrinhos.',
    };
  }

  const normalizedCarrinhosEmUso = new Set<string>();
  const { data: logs, error: logsError } = await supabase
    .from('producao_etapas_log')
    .select('id, ordem_producao_id, etapa, fim, dados_qualidade, qtd_saida')
    .in('etapa', ['fermentacao', 'entrada_forno', 'saida_forno', 'entrada_embalagem']);

  if (!logsError) {
    type StepLogSnapshot = {
      id: string;
      ordem_producao_id: string;
      etapa: string;
      fim: string | null;
      dados_qualidade: unknown;
      qtd_saida: number | null;
    };
    const rows = (logs ?? []) as StepLogSnapshot[];

    const entradaFornoByFermentacaoLogId = new Set<string>();
    for (const row of rows) {
      if (row.etapa !== 'entrada_forno') continue;
      const dq = row.dados_qualidade as FornoQualityData | null;
      const fermLogId = String(dq?.fermentacao_log_id ?? '').trim();
      if (fermLogId) entradaFornoByFermentacaoLogId.add(fermLogId);
    }

    for (const row of rows) {
      if (row.etapa !== 'fermentacao') continue;
      const dq = row.dados_qualidade as FermentacaoQualityData | null;
      if (dq?.excluido_da_lista_forno === true) continue;
      if (entradaFornoByFermentacaoLogId.has(row.id)) continue;
      const norm = normalizeNumeroCarrinhoFermentacao(dq?.numero_carrinho);
      if (norm) normalizedCarrinhosEmUso.add(norm);
    }

    for (const row of rows) {
      if (row.etapa !== 'saida_forno' || row.fim == null) continue;
      const dqSaida = row.dados_qualidade as SaidaFornoQualityData | null;
      const norm = normalizeNumeroCarrinhoFermentacao(dqSaida?.numero_carrinho);
      if (!norm) continue;
      const latasSaida = latasSaidaFornoDoLog(dqSaida);
      let consumido = 0;
      for (const emb of rows) {
        if (emb.etapa !== 'entrada_embalagem' || emb.fim == null || emb.ordem_producao_id !== row.ordem_producao_id) {
          continue;
        }
        const dqEmb = emb.dados_qualidade as EmbalagemQualityData | null;
        if (dqEmb?.saida_forno_log_id !== row.id) continue;
        if (dqEmb?.assadeiras != null && Number.isFinite(Number(dqEmb.assadeiras))) {
          consumido += Number(dqEmb.assadeiras);
        }
      }
      if (latasSaida - consumido > 0) normalizedCarrinhosEmUso.add(norm);
    }
  }

  const list = ((data ?? []) as CarrinhoRow[]).map((row) => {
    if (!row.ativo) return row;
    const norm = normalizeNumeroCarrinhoFermentacao(String(row.numero));
    if (!norm) return row;
    if (!normalizedCarrinhosEmUso.has(norm)) return row;
    return { ...row, em_uso: true };
  });

  return { ok: true, list };
}

function clampInt(n: number, min: number, max?: number): number {
  let v = Math.round(n);
  if (!Number.isFinite(v)) v = min;
  if (v < min) v = min;
  if (max !== undefined && v > max) v = max;
  return v;
}

/** Bandejas e latas são a mesma unidade no carrinho; gravamos o mesmo valor nas duas colunas do banco. */
export async function createCarrinho(input: {
  numero: number;
  /** Capacidade máxima (bandejas = latas). */
  capacidadeBandejasLatas?: number;
  precisaReparos?: boolean;
  emUso?: boolean;
  latasOcupadas?: number;
  ativo?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const n = Math.round(input.numero);
  if (!Number.isFinite(n) || n <= 0) {
    return { success: false, error: 'Informe um número do carrinho maior que zero.' };
  }

  const capacidade = Math.max(0, Math.round(input.capacidadeBandejasLatas ?? 0));
  const emUso = input.emUso ?? false;
  let latasOcupadas = Math.max(0, Math.round(input.latasOcupadas ?? 0));
  if (!emUso) latasOcupadas = 0;
  if (capacidade > 0) {
    latasOcupadas = Math.min(latasOcupadas, capacidade);
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { error } = await supabase.from('carrinhos').insert({
    numero: n,
    bandejas: capacidade,
    precisa_reparos: input.precisaReparos ?? false,
    quantidade_latas: capacidade,
    em_uso: emUso,
    latas_ocupadas: latasOcupadas,
    ativo: input.ativo ?? true,
  });

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { success: false, error: 'Já existe um carrinho com este número.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(PATH);
  return { success: true };
}

/** Cria vários carrinhos em sequência (ex.: 1..20). */
export async function createCarrinhosEmLote(input: {
  numeroInicial: number;
  numeroFinal: number;
  /** Capacidade máxima (bandejas = latas). */
  capacidadeBandejasLatas?: number;
  precisaReparos?: boolean;
  ativo?: boolean;
}): Promise<{ success: boolean; created?: number; error?: string }> {
  const inicio = Math.round(input.numeroInicial);
  const fim = Math.round(input.numeroFinal);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio <= 0 || fim <= 0) {
    return { success: false, error: 'Informe um intervalo válido (números maiores que zero).' };
  }
  if (fim < inicio) {
    return { success: false, error: 'O número final deve ser maior ou igual ao inicial.' };
  }

  const capacidade = Math.max(0, Math.round(input.capacidadeBandejasLatas ?? 0));
  if (!Number.isFinite(capacidade) || capacidade <= 0) {
    return { success: false, error: 'Informe a capacidade do lote (maior que zero).' };
  }
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data: existentes, error: existentesErr } = await supabase
    .from('carrinhos')
    .select('numero')
    .gte('numero', inicio)
    .lte('numero', fim);

  if (existentesErr) {
    return { success: false, error: existentesErr.message };
  }

  const usados = new Set<number>(((existentes ?? []) as Array<{ numero: number }>).map((x) => Number(x.numero)));
  const paraInserir: Array<{
    numero: number;
    bandejas: number;
    precisa_reparos: boolean;
    quantidade_latas: number;
    em_uso: boolean;
    latas_ocupadas: number;
    ativo: boolean;
  }> = [];

  for (let n = inicio; n <= fim; n += 1) {
    if (usados.has(n)) continue;
    paraInserir.push({
      numero: n,
      bandejas: capacidade,
      precisa_reparos: input.precisaReparos ?? false,
      quantidade_latas: capacidade,
      em_uso: false,
      latas_ocupadas: 0,
      ativo: input.ativo ?? true,
    });
  }

  if (paraInserir.length === 0) {
    return { success: false, error: 'Todos os carrinhos deste intervalo já existem.' };
  }

  const { error } = await supabase.from('carrinhos').insert(paraInserir);
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(PATH);
  return { success: true, created: paraInserir.length };
}

export async function updateCarrinho(input: {
  id: string;
  numero: number;
  /** Capacidade máxima (bandejas = latas). */
  capacidadeBandejasLatas: number;
  precisaReparos: boolean;
  emUso: boolean;
  latasOcupadas: number;
  ativo: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const n = Math.round(input.numero);
  if (!Number.isFinite(n) || n <= 0) {
    return { success: false, error: 'O número do carrinho deve ser maior que zero.' };
  }

  const capacidade = clampInt(input.capacidadeBandejasLatas, 0);
  const emUso = input.emUso;
  let latasOcupadas = clampInt(input.latasOcupadas, 0);
  if (!emUso) latasOcupadas = 0;
  if (capacidade > 0) {
    latasOcupadas = Math.min(latasOcupadas, capacidade);
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { error } = await supabase
    .from('carrinhos')
    .update({
      numero: n,
      bandejas: capacidade,
      precisa_reparos: input.precisaReparos,
      quantidade_latas: capacidade,
      em_uso: emUso,
      latas_ocupadas: latasOcupadas,
      ativo: input.ativo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id);

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { success: false, error: 'Já existe outro carrinho com este número.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(PATH);
  return { success: true };
}
