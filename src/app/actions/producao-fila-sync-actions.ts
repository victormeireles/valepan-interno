'use server';

import { revalidatePath } from 'next/cache';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Json } from '@/types/database';
import type { EmbalagemQualityData, FornoQualityData, SaidaFornoQualityData } from '@/domain/types/producao-etapas';
import type { Station } from '@/lib/utils/production-conversions';
import { isVinculoReceitaMassaAtiva } from '@/lib/utils/receita-massa-eligibility';
import { sumLatasFromFornoLogRows } from '@/lib/utils/forno-volume';
import { latasSaidaFornoDoLog } from '@/lib/utils/entrada-embalagem-saida';

export type EtapaFilaSyncPreRequisitos = Exclude<Station, 'massa'>;

/** Volumes editáveis no modal antes de gravar logs sintéticos de pré-requisito (perdas / retificação). */
export type SincronizarPreRequisitosOverrides = {
  /** Receitas de massa a registar quando o passo «massa» for criado (mín. 1). */
  receitasBatidasMassa?: number;
  /** Latas (LT) no lote sintético de fermentação. */
  latasFermentacao?: number;
  /** Latas (LT) na entrada no forno (ciclo em aberto). */
  latasEntradaForno?: number;
  /** Bandejas (LT) na saída do forno. */
  bandejasSaidaForno?: number;
  /** Latas (LT) na entrada na embalagem. */
  latasEntradaEmbalagem?: number;
  /** Nota do operador (auditoria, máx. 240 caracteres). */
  observacoesOperador?: string;
};

const OVERRIDE_MIN = 1;
const OVERRIDE_MAX = 500;

function clampOverrideInt(value: number | undefined, fallback: number): number {
  const v = value == null ? fallback : Math.round(Number(value));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(OVERRIDE_MAX, Math.max(OVERRIDE_MIN, v));
}

function obsTrimmed(s: string | undefined): string {
  const t = String(s ?? '').trim();
  return t.length > 240 ? t.slice(0, 240) : t;
}

type ProdutoReceitaRow = {
  produto_id: string;
  receita_id?: string | null;
  quantidade_por_produto: number;
  tipo?: string | null;
  receitas?: { tipo?: string | null; ativo?: boolean | null } | null;
};

const SYNC_FLAG = 'ajuste_manual_pre_requisitos_fila';

function nowIso(): string {
  return new Date().toISOString();
}

function chainParaEtapa(
  etapaFila: EtapaFilaSyncPreRequisitos,
): Array<'massa' | 'fermentacao' | 'entrada_forno' | 'saida_forno' | 'entrada_embalagem'> {
  switch (etapaFila) {
    case 'fermentacao':
      return ['massa'];
    case 'entrada_forno':
      return ['massa', 'fermentacao'];
    case 'saida_forno':
      return ['massa', 'fermentacao', 'entrada_forno', 'saida_forno'];
    case 'entrada_embalagem':
      return ['massa', 'fermentacao', 'entrada_forno', 'saida_forno'];
    case 'saida_embalagem':
      return ['massa', 'fermentacao', 'entrada_forno', 'saida_forno', 'entrada_embalagem'];
    default:
      return [];
  }
}

async function receitaMassaParaProduto(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  produtoId: string,
): Promise<{ receita_id: string; quantidade_por_produto: number } | null> {
  const { data, error } = await supabase
    .from('produto_receitas')
    .select(
      `
      produto_id,
      receita_id,
      quantidade_por_produto,
      tipo,
      receitas!produto_receitas_receita_id_fkey ( tipo, ativo )
    `,
    )
    .eq('produto_id', produtoId)
    .eq('ativo', true);

  if (error || !data) return null;
  for (const raw of data as unknown as ProdutoReceitaRow[]) {
    if (isVinculoReceitaMassaAtiva(raw)) {
      const rid = raw.receita_id != null ? String(raw.receita_id).trim() : '';
      const qpp = Number(raw.quantidade_por_produto);
      if (rid && Number.isFinite(qpp) && qpp > 0) {
        return { receita_id: rid, quantidade_por_produto: qpp };
      }
    }
  }
  return null;
}

async function ordemTemMassaComReceita(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  ordemId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('producao_etapas_log')
    .select('receita_id, receitas_batidas')
    .eq('ordem_producao_id', ordemId)
    .eq('etapa', 'massa');
  for (const row of data ?? []) {
    const r = row as { receita_id?: string | null; receitas_batidas?: number | null };
    if (r.receita_id != null && String(r.receita_id).trim() !== '') {
      const n = Number(r.receitas_batidas) || 0;
      if (n > 0) return true;
    }
  }
  return false;
}

async function ordemTemFermentacaoReceita(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  ordemId: string,
  qpp: number,
): Promise<boolean> {
  if (!Number.isFinite(qpp) || qpp <= 0) return true;
  const { data } = await supabase
    .from('producao_etapas_log')
    .select('qtd_saida, fim')
    .eq('ordem_producao_id', ordemId)
    .eq('etapa', 'fermentacao')
    .not('fim', 'is', null);
  let rec = 0;
  for (const row of data ?? []) {
    const qs = (row as { qtd_saida?: number | null }).qtd_saida;
    if (qs != null && !Number.isNaN(Number(qs))) {
      rec += Number(qs) / qpp;
    }
  }
  return rec > 0.001;
}

async function fornoEntradaLatasTotal(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  ordemId: string,
  ua: number | null,
): Promise<number> {
  const { data } = await supabase
    .from('producao_etapas_log')
    .select('dados_qualidade, qtd_saida')
    .eq('ordem_producao_id', ordemId)
    .eq('etapa', 'entrada_forno');
  return sumLatasFromFornoLogRows((data ?? []) as { dados_qualidade?: unknown; qtd_saida?: number | null }[], ua);
}

async function saidaFornoBandejasTotal(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  ordemId: string,
): Promise<number> {
  const { data } = await supabase
    .from('producao_etapas_log')
    .select('dados_qualidade, fim')
    .eq('ordem_producao_id', ordemId)
    .eq('etapa', 'saida_forno')
    .not('fim', 'is', null);
  let s = 0;
  for (const row of data ?? []) {
    const dq = (row as { dados_qualidade?: unknown }).dados_qualidade as SaidaFornoQualityData | null;
    s += latasSaidaFornoDoLog(dq);
  }
  return s;
}

async function entradaEmbalagemRegistros(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  ordemId: string,
): Promise<number> {
  const { data } = await supabase
    .from('producao_etapas_log')
    .select('id, fim')
    .eq('ordem_producao_id', ordemId)
    .eq('etapa', 'entrada_embalagem')
    .not('fim', 'is', null);
  return (data ?? []).length;
}

async function ultimoFermentacaoConcluidoId(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  ordemId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('producao_etapas_log')
    .select('id, fim')
    .eq('ordem_producao_id', ordemId)
    .eq('etapa', 'fermentacao')
    .not('fim', 'is', null)
    .order('fim', { ascending: false })
    .limit(1)
    .maybeSingle();
  const id = (data as { id?: string } | null)?.id;
  return id && String(id).trim() ? String(id) : null;
}

async function ultimoSaidaFornoConcluidoId(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  ordemId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('producao_etapas_log')
    .select('id, fim')
    .eq('ordem_producao_id', ordemId)
    .eq('etapa', 'saida_forno')
    .not('fim', 'is', null)
    .order('fim', { ascending: false })
    .limit(1)
    .maybeSingle();
  const id = (data as { id?: string } | null)?.id;
  return id && String(id).trim() ? String(id) : null;
}

/**
 * Cria registos mínimos em `producao_etapas_log` para que a ordem passe a cumprir os pré-requisitos
 * da etapa da fila onde o utilizador está (ex.: padeiro esqueceu de registar no sistema).
 */
export async function sincronizarPreRequisitosOrdemParaEtapaFila(input: {
  ordemId: string;
  etapaFila: EtapaFilaSyncPreRequisitos;
  overrides?: SincronizarPreRequisitosOverrides;
}): Promise<{ success: true; etapasAjustadas: string[] } | { success: false; error: string }> {
  const ordemId = String(input.ordemId ?? '').trim();
  if (!ordemId) {
    return { success: false, error: 'Ordem inválida.' };
  }

  const chain = chainParaEtapa(input.etapaFila);
  if (chain.length === 0) {
    return { success: false, error: 'Esta etapa não permite este ajuste.' };
  }

  const ov = input.overrides;
  const receitasMassa = clampOverrideInt(ov?.receitasBatidasMassa, 1);
  const latasFerm = clampOverrideInt(ov?.latasFermentacao, 1);
  const latasEntradaForno = clampOverrideInt(ov?.latasEntradaForno, 1);
  const bandejasSaida = clampOverrideInt(ov?.bandejasSaidaForno, 1);
  const latasEntradaEmb = clampOverrideInt(ov?.latasEntradaEmbalagem, 1);
  const obsOp = obsTrimmed(ov?.observacoesOperador);

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data: ordem, error: oErr } = await supabase
    .from('ordens_producao')
    .select('id, produto_id, status')
    .eq('id', ordemId)
    .maybeSingle();

  if (oErr || !ordem) {
    return { success: false, error: 'Ordem de produção não encontrada.' };
  }

  const st = String((ordem as { status?: string | null }).status ?? '').toLowerCase();
  if (st === 'concluido' || st === 'cancelado') {
    return { success: false, error: 'Não é possível ajustar ordem concluída ou cancelada.' };
  }

  const produtoId = String((ordem as { produto_id?: string }).produto_id ?? '').trim();
  if (!produtoId) {
    return { success: false, error: 'Ordem sem produto.' };
  }

  const { data: prodRow } = await supabase
    .from('produtos')
    .select('unidades_assadeira')
    .eq('id', produtoId)
    .maybeSingle();
  const uaRaw = (prodRow as { unidades_assadeira?: number | null } | null)?.unidades_assadeira;
  const ua =
    uaRaw != null && Number.isFinite(Number(uaRaw)) && Number(uaRaw) > 0 ? Math.round(Number(uaRaw)) : null;

  const receitaMassa = await receitaMassaParaProduto(supabase, produtoId);
  if (!receitaMassa) {
    return {
      success: false,
      error: 'Configure uma receita de massa ativa para este produto antes de sincronizar.',
    };
  }

  const { quantidade_por_produto: qpp, receita_id: receitaMassaId } = receitaMassa;
  const etapasAjustadas: string[] = [];
  const t = nowIso();
  const carrinhoFicticio = `SYNC-${ordemId.slice(0, 8)}`;

  const insertLog = async (row: Record<string, unknown>) => {
    const { error } = await supabase.from('producao_etapas_log').insert(row as never);
    if (error) {
      throw new Error(error.message);
    }
  };

  try {
    for (const step of chain) {
      if (step === 'massa') {
        if (await ordemTemMassaComReceita(supabase, ordemId)) continue;
        const motivoBase = 'Sincronização pré-requisitos (massa)';
        await insertLog({
          ordem_producao_id: ordemId,
          etapa: 'massa',
          qtd_saida: 0,
          perda_qtd: 0,
          receita_id: receitaMassaId,
          receitas_batidas: receitasMassa,
          inicio: t,
          fim: t,
          dados_qualidade: {
            [SYNC_FLAG]: true,
            motivo: obsOp ? `${motivoBase} — ${obsOp}` : motivoBase,
          } as unknown as Json,
          fotos: [],
        });
        etapasAjustadas.push('massa');
        continue;
      }

      if (step === 'fermentacao') {
        if (await ordemTemFermentacaoReceita(supabase, ordemId, qpp)) continue;
        const qFerm = latasFerm * qpp;
        const motivoBase = 'Sincronização pré-requisitos (fermentação)';
        await insertLog({
          ordem_producao_id: ordemId,
          etapa: 'fermentacao',
          qtd_saida: qFerm,
          perda_qtd: 0,
          inicio: t,
          fim: t,
          dados_qualidade: {
            [SYNC_FLAG]: true,
            motivo: obsOp ? `${motivoBase} — ${obsOp}` : motivoBase,
            numero_carrinho: carrinhoFicticio,
            assadeiras_lt: latasFerm,
          } as unknown as Json,
          fotos: [],
        });
        etapasAjustadas.push('fermentacao');
        continue;
      }

      if (step === 'entrada_forno') {
        if ((await fornoEntradaLatasTotal(supabase, ordemId, ua)) > 0) continue;
        const fermId = await ultimoFermentacaoConcluidoId(supabase, ordemId);
        if (!fermId) {
          return { success: false, error: 'Não foi possível obter fermentação concluída para vincular à entrada no forno.' };
        }
        const qForno = ua != null ? latasEntradaForno * ua : latasEntradaForno;
        const dqForno: FornoQualityData = {
          fermentacao_log_id: fermId,
          assadeiras_lt: latasEntradaForno,
          observacoes: obsOp ? `${SYNC_FLAG} — ${obsOp}` : SYNC_FLAG,
        };
        await insertLog({
          ordem_producao_id: ordemId,
          etapa: 'entrada_forno',
          qtd_saida: qForno,
          perda_qtd: 0,
          inicio: t,
          fim: null,
          dados_qualidade: dqForno as unknown as Json,
          fotos: [],
        });
        etapasAjustadas.push('entrada_forno');
        continue;
      }

      if (step === 'saida_forno') {
        if ((await saidaFornoBandejasTotal(supabase, ordemId)) > 0) continue;
        const dqSaida: SaidaFornoQualityData = {
          numero_carrinho: carrinhoFicticio,
          bandejas: bandejasSaida,
          observacoes: obsOp ? `${SYNC_FLAG} — ${obsOp}` : SYNC_FLAG,
        };
        await insertLog({
          ordem_producao_id: ordemId,
          etapa: 'saida_forno',
          qtd_saida: 0,
          perda_qtd: 0,
          inicio: t,
          fim: t,
          dados_qualidade: dqSaida as unknown as Json,
          fotos: [],
        });
        etapasAjustadas.push('saida_forno');
        continue;
      }

      if (step === 'entrada_embalagem') {
        if ((await entradaEmbalagemRegistros(supabase, ordemId)) > 0) continue;
        const saidaId = await ultimoSaidaFornoConcluidoId(supabase, ordemId);
        if (!saidaId) {
          return { success: false, error: 'Não foi possível obter saída do forno concluída para a entrada na embalagem.' };
        }
        const dqEmb: EmbalagemQualityData = {
          numero_carrinho: carrinhoFicticio,
          assadeiras: latasEntradaEmb,
          saida_forno_log_id: saidaId,
          observacoes: obsOp ? `${SYNC_FLAG} — ${obsOp}` : SYNC_FLAG,
        };
        await insertLog({
          ordem_producao_id: ordemId,
          etapa: 'entrada_embalagem',
          qtd_saida: latasEntradaEmb,
          perda_qtd: 0,
          inicio: t,
          fim: t,
          dados_qualidade: dqEmb as unknown as Json,
          fotos: [],
        });
        etapasAjustadas.push('entrada_embalagem');
      }
    }

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${ordemId}`);

    return { success: true, etapasAjustadas };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg || 'Erro ao sincronizar pré-requisitos.' };
  }
}
