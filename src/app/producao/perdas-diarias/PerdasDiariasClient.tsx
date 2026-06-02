'use client';

import { useCallback, useState, useTransition, type ReactNode } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import DateInput from '@/components/FormControls/DateInput';
import { formatIsoDateToDDMMYYYY } from '@/lib/utils/date-utils';
import {
  getPerdasProducaoPorDia,
  type PerdasProducaoDiaResult,
  type PerdaOrdemLinha,
  type PerdaProdutoAgregado,
  type PerdasDiaResumo,
} from '@/app/actions/producao-perdas-actions';

function fmtPerda(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ',');
}

function fmtPct(p: number | null): string {
  if (p == null || !Number.isFinite(p)) return '—';
  return `${p.toFixed(1).replace('.', ',')}%`;
}

function labelEtapaMaior(k: PerdasDiaResumo['etapaMaiorPerdaLt']): string {
  if (k === 'f_ef') return 'F→EF';
  if (k === 'ef_sf') return 'EF→SF';
  if (k === 'sf_ee') return 'SF→EE';
  return '';
}

function celulaPerdaLt(lt: number, pctSobrePico: number | null): ReactNode {
  const show = fmtPerda(lt);
  if (lt <= 0) return <span className="text-slate-400">—</span>;
  if (pctSobrePico == null) {
    return <span className="text-rose-700 font-semibold tabular-nums">{show}</span>;
  }
  const t = `${show} LT (${pctSobrePico.toFixed(1).replace('.', ',')}% do pico LT desta OP)`;
  return (
    <span className="text-rose-700 font-semibold tabular-nums" title={t}>
      {show}
    </span>
  );
}

const th =
  'border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-600 sm:px-3 sm:text-xs';
const td = 'border-b border-slate-100 px-2 py-2 text-sm text-slate-800 tabular-nums sm:px-3';
const tdNome = 'border-b border-slate-100 px-2 py-2 text-left text-sm font-medium text-slate-900 sm:px-3';

function ResumoDia({ r }: { r: PerdasDiaResumo }) {
  if (r.totalPerdasLt <= 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:text-sm">
        Sem perdas (LT) calculadas para esta data.
      </p>
    );
  }

  const maior = labelEtapaMaior(r.etapaMaiorPerdaLt);
  const pTot = r.pctEtapaSobreTotalPerdas;
  const pMax = r.pctEtapaSobrePerdaMaxima;

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 text-xs text-amber-950 sm:text-sm">
      <p>
        <span className="font-semibold tabular-nums">{fmtPerda(r.totalPerdasLt)} LT</span> no dia
        {r.pctPerdasSobrePicoDia != null && (
          <>
            {' '}
            · <span className="tabular-nums">{fmtPct(r.pctPerdasSobrePicoDia)}</span>{' '}
            <span className="text-amber-900/85">sobre o volume de pico (LT) das OPs</span>
          </>
        )}
      </p>
      <p className="mt-1.5 text-amber-900/90 leading-snug">
        <span className="text-amber-800/90">Do total de perdas:</span> F→EF {fmtPct(pTot.fEf)} · EF→SF {fmtPct(pTot.efSf)} · SF→EE{' '}
        {fmtPct(pTot.sfEe)}
        {maior && (
          <>
            {' '}
            · <span className="font-medium">Mais LT perdido em:</span> {maior}
          </>
        )}
      </p>
      <details className="mt-1.5 text-[11px] text-amber-900/85 sm:text-xs">
        <summary className="cursor-pointer select-none font-medium text-amber-900/90 hover:text-amber-950">
          % sobre a maior perda entre etapas (dia)
        </summary>
        <p className="mt-1.5 pl-0.5 leading-snug">
          F→EF {fmtPct(pMax.fEf)} · EF→SF {fmtPct(pMax.efSf)} · SF→EE {fmtPct(pMax.sfEe)}{' '}
          <span className="italic text-amber-900/75">(100% = etapa com mais LT perdido)</span>
        </p>
      </details>
    </div>
  );
}

export default function PerdasDiariasClient({ dadosInicial }: { dadosInicial: PerdasProducaoDiaResult }) {
  const [dados, setDados] = useState<PerdasProducaoDiaResult>(dadosInicial);
  const [dataIso, setDataIso] = useState(dadosInicial.dataReferencia);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const consultar = useCallback(() => {
    if (!dataIso) return;
    setErro(null);
    startTransition(async () => {
      try {
        const res = await getPerdasProducaoPorDia(dataIso);
        setDados(res);
        setDataIso(res.dataReferencia);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar.');
      }
    });
  }, [dataIso]);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Perdas diárias (produção)" icon="trending_down" />

      <div className="mx-auto max-w-[min(100rem,calc(100vw-1.5rem))] space-y-5 px-3 py-6 sm:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="min-w-0 flex-1 max-w-md">
            <DateInput
              label="Data de produção"
              value={dataIso}
              onChange={(iso) => {
                if (iso) setDataIso(iso);
              }}
              required
            />
          </div>
          <button
            type="button"
            disabled={pending || !dataIso}
            onClick={consultar}
            className="shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? 'A carregar…' : 'Consultar'}
          </button>
        </div>

        <p className="text-xs text-slate-600 sm:text-sm">
          Data: <strong>{formatIsoDateToDDMMYYYY(dados.dataReferencia)}</strong>. Só perdas em LT entre etapas
          consecutivas. «Pico» = maior volume LT registado na mesma OP (referência para %).
        </p>

        <ResumoDia r={dados.resumo} />

        {erro && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            {erro}
          </p>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">Por produto</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Produto</th>
                  <th className={th} title="Ordens com data de produção neste dia">
                    OPs
                  </th>
                  <th className={th} title="Fermentação → entrada forno">
                    F→EF
                  </th>
                  <th className={th} title="Entrada forno → saída forno">
                    EF→SF
                  </th>
                  <th className={th} title="Saída forno → entrada embalagem">
                    SF→EE
                  </th>
                  <th className={th} title="Soma das perdas / soma dos picos LT">
                    % pico
                  </th>
                </tr>
              </thead>
              <tbody>
                {dados.porProduto.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      Nenhuma ordem para esta data.
                    </td>
                  </tr>
                ) : (
                  dados.porProduto.map((p: PerdaProdutoAgregado) => {
                    const somaP =
                      p.perdaFermentacaoParaEntradaForno +
                      p.perdaEntradaFornoParaSaidaForno +
                      p.perdaSaidaFornoParaEntradaEmbalagem;
                    return (
                      <tr key={p.produtoId} className="hover:bg-slate-50/80">
                        <td className={tdNome}>{p.produtoNome}</td>
                        <td className={td}>{p.ordensCount}</td>
                        <td className={td}>{celulaPerdaLt(p.perdaFermentacaoParaEntradaForno, null)}</td>
                        <td className={td}>{celulaPerdaLt(p.perdaEntradaFornoParaSaidaForno, null)}</td>
                        <td className={td}>{celulaPerdaLt(p.perdaSaidaFornoParaEntradaEmbalagem, null)}</td>
                        <td className={`${td} text-slate-700`} title={somaP > 0 ? `Perdas / picos agregados deste produto` : undefined}>
                          {fmtPct(p.pctPerdasSobrePico)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">Por ordem</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Produto</th>
                  <th className={th}>Lote</th>
                  <th className={th}>Estado</th>
                  <th className={th}>F→EF</th>
                  <th className={th}>EF→SF</th>
                  <th className={th}>SF→EE</th>
                </tr>
              </thead>
              <tbody>
                {dados.porOrdem.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      —
                    </td>
                  </tr>
                ) : (
                  dados.porOrdem.map((o: PerdaOrdemLinha) => (
                    <tr key={o.ordemId} className="hover:bg-slate-50/80">
                      <td className={tdNome}>{o.produtoNome}</td>
                      <td className={`${td} font-mono text-xs`}>{o.loteCodigo}</td>
                      <td className={td}>{o.status ?? '—'}</td>
                      <td className={td}>
                        {celulaPerdaLt(o.perdaFermentacaoParaEntradaForno, o.pctPerdaFermentacaoSobrePico)}
                      </td>
                      <td className={td}>
                        {celulaPerdaLt(o.perdaEntradaFornoParaSaidaForno, o.pctPerdaEntradaFornoSobrePico)}
                      </td>
                      <td className={td}>
                        {celulaPerdaLt(o.perdaSaidaFornoParaEntradaEmbalagem, o.pctPerdaSaidaFornoSobrePico)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
