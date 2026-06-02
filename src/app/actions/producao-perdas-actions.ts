'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { normalizeToISODate } from '@/lib/utils/date-utils';
import { ltFromFermentacaoLog } from '@/lib/utils/fermentacao-progresso';
import { sumLatasFromFornoLogRows } from '@/lib/utils/forno-volume';
import { latasSaidaFornoDoLog } from '@/lib/utils/entrada-embalagem-saida';
import type { SaidaFornoQualityData } from '@/domain/types/producao-etapas';
import type { EmbalagemQualityData } from '@/domain/types/producao-etapas';

export type PerdaOrdemLinha = {
  ordemId: string;
  loteCodigo: string;
  produtoId: string;
  produtoNome: string;
  status: string | null;
  perdaFermentacaoParaEntradaForno: number;
  perdaEntradaFornoParaSaidaForno: number;
  perdaSaidaFornoParaEntradaEmbalagem: number;
  /** max(LT) entre etapas — referência de fluxo para % */
  refPicoLt: number;
  /** % desta perda sobre o pico da OP (só para contexto / tooltip) */
  pctPerdaFermentacaoSobrePico: number | null;
  pctPerdaEntradaFornoSobrePico: number | null;
  pctPerdaSaidaFornoSobrePico: number | null;
};

export type PerdaProdutoAgregado = {
  produtoId: string;
  produtoNome: string;
  ordensCount: number;
  perdaFermentacaoParaEntradaForno: number;
  perdaEntradaFornoParaSaidaForno: number;
  perdaSaidaFornoParaEntradaEmbalagem: number;
  refPicoLt: number;
  /** (soma das perdas do produto) / (soma dos picos das OPs deste produto) */
  pctPerdasSobrePico: number | null;
};

export type PerdasDiaResumo = {
  totalPerdasLt: number;
  totalRefPicoLt: number;
  pctPerdasSobrePicoDia: number | null;
  perdasLtPorEtapa: { fEf: number; efSf: number; sfEe: number };
  pctEtapaSobreTotalPerdas: { fEf: number | null; efSf: number | null; sfEe: number | null };
  pctEtapaSobrePerdaMaxima: { fEf: number | null; efSf: number | null; sfEe: number | null };
  etapaMaiorPerdaLt: 'f_ef' | 'ef_sf' | 'sf_ee' | null;
};

export type PerdasProducaoDiaResult = {
  dataReferencia: string;
  porOrdem: PerdaOrdemLinha[];
  porProduto: PerdaProdutoAgregado[];
  resumo: PerdasDiaResumo;
};

function resumoVazio(): PerdasDiaResumo {
  return {
    totalPerdasLt: 0,
    totalRefPicoLt: 0,
    pctPerdasSobrePicoDia: null,
    perdasLtPorEtapa: { fEf: 0, efSf: 0, sfEe: 0 },
    pctEtapaSobreTotalPerdas: { fEf: null, efSf: null, sfEe: null },
    pctEtapaSobrePerdaMaxima: { fEf: null, efSf: null, sfEe: null },
    etapaMaiorPerdaLt: null,
  };
}

function clampDelta(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const d = a - b;
  return d > 0.001 ? Math.round(d * 1000) / 1000 : 0;
}

function pctSobreRef(perda: number, ref: number): number | null {
  if (perda <= 0 || ref <= 0) return null;
  return Math.round((perda / ref) * 1000) / 10;
}

function refPicoLt(ltFer: number, ltEnt: number, ltSaida: number, ltEmb: number): number {
  return Math.max(0, ltFer, ltEnt, ltSaida, ltEmb);
}

function ltFermentacaoFromLogs(
  rows: Array<{ qtd_saida?: number | null; dados_qualidade?: unknown }>,
  ua: number | null,
): number {
  let sum = 0;
  for (const log of rows) {
    sum += ltFromFermentacaoLog(log.qtd_saida ?? null, log.dados_qualidade, ua);
  }
  return sum;
}

function ltSaidaFornoFromLogs(rows: Array<{ dados_qualidade?: unknown }>): number {
  let s = 0;
  for (const row of rows) {
    const dq = row.dados_qualidade as SaidaFornoQualityData | null;
    s += latasSaidaFornoDoLog(dq);
  }
  return s;
}

function ltEntradaEmbalagemFromLogs(rows: Array<{ qtd_saida?: number | null; dados_qualidade?: unknown }>): number {
  let s = 0;
  for (const row of rows) {
    const dq = row.dados_qualidade as EmbalagemQualityData | null;
    let latas = 0;
    if (row.qtd_saida != null && !Number.isNaN(Number(row.qtd_saida))) {
      latas = Number(row.qtd_saida);
    } else if (dq?.assadeiras != null && !Number.isNaN(Number(dq.assadeiras))) {
      latas = Number(dq.assadeiras);
    }
    if (latas > 0) s += latas;
  }
  return s;
}

function montarResumo(porOrdem: PerdaOrdemLinha[]): PerdasDiaResumo {
  if (porOrdem.length === 0) return resumoVazio();

  let totalRef = 0;
  let L1 = 0;
  let L2 = 0;
  let L3 = 0;
  for (const r of porOrdem) {
    totalRef += r.refPicoLt;
    L1 += r.perdaFermentacaoParaEntradaForno;
    L2 += r.perdaEntradaFornoParaSaidaForno;
    L3 += r.perdaSaidaFornoParaEntradaEmbalagem;
  }
  const totalPerdas = L1 + L2 + L3;
  const pctDia = totalRef > 0 && totalPerdas > 0 ? Math.round((totalPerdas / totalRef) * 1000) / 10 : null;

  const pctTot = (lt: number): number | null =>
    totalPerdas > 0 && lt > 0 ? Math.round((lt / totalPerdas) * 1000) / 10 : null;

  const M = Math.max(L1, L2, L3);
  const pctMax = (lt: number): number | null =>
    M > 0 && lt > 0 ? Math.round((lt / M) * 1000) / 10 : null;

  let etapaMaior: PerdasDiaResumo['etapaMaiorPerdaLt'] = null;
  if (M > 0) {
    if (L1 >= L2 && L1 >= L3) etapaMaior = 'f_ef';
    else if (L2 >= L1 && L2 >= L3) etapaMaior = 'ef_sf';
    else etapaMaior = 'sf_ee';
  }

  return {
    totalPerdasLt: Math.round(totalPerdas * 1000) / 1000,
    totalRefPicoLt: Math.round(totalRef * 1000) / 1000,
    pctPerdasSobrePicoDia: pctDia,
    perdasLtPorEtapa: {
      fEf: Math.round(L1 * 1000) / 1000,
      efSf: Math.round(L2 * 1000) / 1000,
      sfEe: Math.round(L3 * 1000) / 1000,
    },
    pctEtapaSobreTotalPerdas: {
      fEf: pctTot(L1),
      efSf: pctTot(L2),
      sfEe: pctTot(L3),
    },
    pctEtapaSobrePerdaMaxima: {
      fEf: pctMax(L1),
      efSf: pctMax(L2),
      sfEe: pctMax(L3),
    },
    etapaMaiorPerdaLt: etapaMaior,
  };
}

/**
 * Perdas em LT entre etapas consecutivas (logs) para ordens com `data_producao` no dia.
 * Percentagens: sobre o pico LT da OP; resumo do dia sobre soma dos picos e distribuição entre etapas.
 */
export async function getPerdasProducaoPorDia(dataIso: string): Promise<PerdasProducaoDiaResult> {
  const dataReferencia = normalizeToISODate(dataIso);
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const vazio = (): PerdasProducaoDiaResult => ({
    dataReferencia,
    porOrdem: [],
    porProduto: [],
    resumo: resumoVazio(),
  });

  const { data: ordensRows, error: oErr } = await supabase
    .from('ordens_producao')
    .select('id, lote_codigo, produto_id, data_producao, status')
    .neq('status', 'cancelado');

  if (oErr || !ordensRows?.length) {
    return vazio();
  }

  const ordensNoDia = ordensRows.filter((raw) => {
    const r = raw as { data_producao?: string | null };
    if (r.data_producao == null || String(r.data_producao).trim() === '') return false;
    return normalizeToISODate(r.data_producao) === dataReferencia;
  }) as Array<{
    id: string;
    lote_codigo: string;
    produto_id: string;
    data_producao?: string | null;
    status?: string | null;
  }>;

  if (ordensNoDia.length === 0) {
    return vazio();
  }

  const ordemIds = ordensNoDia.map((o) => o.id);
  const produtoIds = [...new Set(ordensNoDia.map((o) => String(o.produto_id ?? '').trim()).filter(Boolean))];

  const { data: prodRows } = await supabase
    .from('produtos')
    .select('id, nome, unidades_assadeira')
    .in('id', produtoIds);

  const produtoNome = new Map<string, string>();
  const uaPorProduto = new Map<string, number | null>();
  for (const p of prodRows ?? []) {
    const row = p as { id: string; nome?: string | null; unidades_assadeira?: number | null };
    produtoNome.set(row.id, (row.nome ?? '').trim() || '—');
    const ua = row.unidades_assadeira;
    uaPorProduto.set(
      row.id,
      ua != null && Number.isFinite(Number(ua)) && Number(ua) > 0 ? Math.round(Number(ua)) : null,
    );
  }

  const { data: logsFerm } = await supabase
    .from('producao_etapas_log')
    .select('ordem_producao_id, qtd_saida, dados_qualidade')
    .eq('etapa', 'fermentacao')
    .not('fim', 'is', null)
    .in('ordem_producao_id', ordemIds);

  const { data: logsEntradaForno } = await supabase
    .from('producao_etapas_log')
    .select('ordem_producao_id, qtd_saida, dados_qualidade')
    .eq('etapa', 'entrada_forno')
    .in('ordem_producao_id', ordemIds);

  const { data: logsSaidaForno } = await supabase
    .from('producao_etapas_log')
    .select('ordem_producao_id, dados_qualidade')
    .eq('etapa', 'saida_forno')
    .not('fim', 'is', null)
    .in('ordem_producao_id', ordemIds);

  const { data: logsEntradaEmb } = await supabase
    .from('producao_etapas_log')
    .select('ordem_producao_id, qtd_saida, dados_qualidade')
    .eq('etapa', 'entrada_embalagem')
    .not('fim', 'is', null)
    .in('ordem_producao_id', ordemIds);

  const fermByOrdem = new Map<string, Array<{ qtd_saida?: number | null; dados_qualidade?: unknown }>>();
  const entradaFornoByOrdem = new Map<string, Array<{ dados_qualidade?: unknown; qtd_saida?: number | null }>>();
  const saidaFornoByOrdem = new Map<string, Array<{ dados_qualidade?: unknown }>>();
  const entradaEmbByOrdem = new Map<string, Array<{ qtd_saida?: number | null; dados_qualidade?: unknown }>>();

  for (const row of logsFerm ?? []) {
    const oid = String((row as { ordem_producao_id: string }).ordem_producao_id);
    const list = fermByOrdem.get(oid) ?? [];
    list.push(row as { qtd_saida?: number | null; dados_qualidade?: unknown });
    fermByOrdem.set(oid, list);
  }
  for (const row of logsEntradaForno ?? []) {
    const oid = String((row as { ordem_producao_id: string }).ordem_producao_id);
    const list = entradaFornoByOrdem.get(oid) ?? [];
    list.push(row as { dados_qualidade?: unknown; qtd_saida?: number | null });
    entradaFornoByOrdem.set(oid, list);
  }
  for (const row of logsSaidaForno ?? []) {
    const oid = String((row as { ordem_producao_id: string }).ordem_producao_id);
    const list = saidaFornoByOrdem.get(oid) ?? [];
    list.push(row as { dados_qualidade?: unknown });
    saidaFornoByOrdem.set(oid, list);
  }
  for (const row of logsEntradaEmb ?? []) {
    const oid = String((row as { ordem_producao_id: string }).ordem_producao_id);
    const list = entradaEmbByOrdem.get(oid) ?? [];
    list.push(row as { qtd_saida?: number | null; dados_qualidade?: unknown });
    entradaEmbByOrdem.set(oid, list);
  }

  const porOrdem: PerdaOrdemLinha[] = [];

  for (const o of ordensNoDia) {
    const pid = String(o.produto_id ?? '').trim();
    const ua = uaPorProduto.get(pid) ?? null;
    const ltFer = ltFermentacaoFromLogs(fermByOrdem.get(o.id) ?? [], ua);
    const ltEntForno = sumLatasFromFornoLogRows(entradaFornoByOrdem.get(o.id) ?? [], ua);
    const ltSaidaForno = ltSaidaFornoFromLogs(saidaFornoByOrdem.get(o.id) ?? []);
    const ltEntEmb = ltEntradaEmbalagemFromLogs(entradaEmbByOrdem.get(o.id) ?? []);

    const pFf = clampDelta(ltFer, ltEntForno);
    const pFeSf = clampDelta(ltEntForno, ltSaidaForno);
    const pSfEe = clampDelta(ltSaidaForno, ltEntEmb);

    const ltFerR = Math.round(ltFer * 1000) / 1000;
    const ltEntR = Math.round(ltEntForno * 1000) / 1000;
    const ltSaidaR = Math.round(ltSaidaForno * 1000) / 1000;
    const ltEmbR = Math.round(ltEntEmb * 1000) / 1000;
    const ref = refPicoLt(ltFerR, ltEntR, ltSaidaR, ltEmbR);

    porOrdem.push({
      ordemId: o.id,
      loteCodigo: (o.lote_codigo ?? '').trim() || o.id.slice(0, 8),
      produtoId: pid,
      produtoNome: produtoNome.get(pid) ?? '—',
      status: o.status ?? null,
      perdaFermentacaoParaEntradaForno: pFf,
      perdaEntradaFornoParaSaidaForno: pFeSf,
      perdaSaidaFornoParaEntradaEmbalagem: pSfEe,
      refPicoLt: ref,
      pctPerdaFermentacaoSobrePico: pctSobreRef(pFf, ref),
      pctPerdaEntradaFornoSobrePico: pctSobreRef(pFeSf, ref),
      pctPerdaSaidaFornoSobrePico: pctSobreRef(pSfEe, ref),
    });
  }

  porOrdem.sort((a, b) => a.produtoNome.localeCompare(b.produtoNome, 'pt') || a.loteCodigo.localeCompare(b.loteCodigo, 'pt'));

  const aggMap = new Map<string, PerdaProdutoAgregado>();
  for (const row of porOrdem) {
    const cur =
      aggMap.get(row.produtoId) ??
      ({
        produtoId: row.produtoId,
        produtoNome: row.produtoNome,
        ordensCount: 0,
        perdaFermentacaoParaEntradaForno: 0,
        perdaEntradaFornoParaSaidaForno: 0,
        perdaSaidaFornoParaEntradaEmbalagem: 0,
        refPicoLt: 0,
        pctPerdasSobrePico: null,
      } satisfies PerdaProdutoAgregado);
    cur.ordensCount += 1;
    cur.perdaFermentacaoParaEntradaForno += row.perdaFermentacaoParaEntradaForno;
    cur.perdaEntradaFornoParaSaidaForno += row.perdaEntradaFornoParaSaidaForno;
    cur.perdaSaidaFornoParaEntradaEmbalagem += row.perdaSaidaFornoParaEntradaEmbalagem;
    cur.refPicoLt += row.refPicoLt;
    aggMap.set(row.produtoId, cur);
  }

  const porProduto = [...aggMap.values()].map((p) => {
    const soma =
      p.perdaFermentacaoParaEntradaForno + p.perdaEntradaFornoParaSaidaForno + p.perdaSaidaFornoParaEntradaEmbalagem;
    return {
      ...p,
      pctPerdasSobrePico: pctSobreRef(soma, p.refPicoLt),
    };
  });
  porProduto.sort((a, b) => a.produtoNome.localeCompare(b.produtoNome, 'pt'));

  const resumo = montarResumo(porOrdem);

  return { dataReferencia, porOrdem, porProduto, resumo };
}
