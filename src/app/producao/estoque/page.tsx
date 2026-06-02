import Link from 'next/link';
import { Suspense } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import ProducaoEstoqueMostrarSemEstoqueCheckbox from '@/components/Producao/ProducaoEstoqueMostrarSemEstoqueCheckbox';
import { getEstoqueEmbalagemResumoPorProduto } from '@/app/actions/estoque-embalagem-actions';
import {
  filaUrlForProductionStep,
  parseFilaDataQuery,
  producaoEstoqueUrl,
} from '@/lib/production/production-station-routes';
import { formatIsoDateToDDMMYYYY, getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ data?: string; todas?: string; mostrar_sem_estoque?: string }>;
}

export default async function ProducaoEstoquePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const mostrarSemEstoque =
    params?.mostrar_sem_estoque === '1' ||
    String(params?.mostrar_sem_estoque ?? '').toLowerCase() === 'true';
  const parsed = parseFilaDataQuery(params?.data ?? null);
  // Padrão: estoque contínuo (acumulado de todas as datas). Só filtra por data
  // quando uma data válida é informada (campo «Data» ou link «Hoje»).
  const dataIso = parsed;
  const todas = dataIso == null;

  const res = await getEstoqueEmbalagemResumoPorProduto({ dataProducaoIso: dataIso });

  const hojeIso = getTodayISOInBrazilTimezone();
  const linhasVisiveis =
    res.success && !mostrarSemEstoque
      ? res.data.filter((row) => row.quantidade_caixas > 0)
      : res.success
        ? res.data
        : [];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader title="Produção — Estoque" icon="table_chart" />

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:space-y-6 sm:p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={filaUrlForProductionStep('saida_embalagem', { data: dataIso ?? hojeIso })}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 sm:text-sm"
          >
            ← Voltar à fila de saída de embalagem
          </Link>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-4">
          <p className="text-xs text-slate-700 sm:text-sm">
            {todas ? (
              <>
                <span className="font-semibold text-slate-900">Filtro:</span> todas as datas de produção.
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-900">Filtro:</span> data de produção{' '}
                <span className="tabular-nums">{formatIsoDateToDDMMYYYY(dataIso!)}</span> (fuso de Brasília).
              </>
            )}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Suspense fallback={null}>
              <ProducaoEstoqueMostrarSemEstoqueCheckbox />
            </Suspense>
            <div className="flex flex-wrap items-center gap-2">
              <form className="flex flex-wrap items-center gap-2" action="/producao/estoque" method="get">
                {todas ? <input type="hidden" name="todas" value="1" /> : null}
                {mostrarSemEstoque ? <input type="hidden" name="mostrar_sem_estoque" value="1" /> : null}
                <label className="flex items-center gap-2 text-xs text-slate-700 sm:text-sm">
                  <span className="font-medium">Data</span>
                  <input
                    type="date"
                    name="data"
                    defaultValue={dataIso ?? hojeIso}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs tabular-nums text-slate-900 sm:text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:text-sm"
                >
                  Aplicar
                </button>
              </form>
              <Link
                href={producaoEstoqueUrl({ data: hojeIso, mostrarSemEstoque })}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 sm:text-sm"
              >
                Hoje
              </Link>
              <Link
                href={producaoEstoqueUrl({ todas: true, mostrarSemEstoque })}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 sm:text-sm"
              >
                Todas as datas
              </Link>
            </div>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
          Produtos ativos, tipo de embalagem cadastrado no produto e total de caixas já informadas na saída de embalagem
          {todas ? '' : ` com data de produção em ${formatIsoDateToDDMMYYYY(dataIso!)}`}. Para preencher o tipo (ex.:
          Lisa, Valepan, Damião), aplique a migração SQL e edite{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">tipo_embalagem</code> em cada produto.
        </p>

        {!res.success ? (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900"
            role="alert"
          >
            {res.error}
          </div>
        ) : res.data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
            Nenhum produto ativo encontrado.
          </p>
        ) : linhasVisiveis.length === 0 ? (
          <div className="space-y-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-6 text-sm text-amber-950">
            <p>
              Nenhum produto com quantidade em estoque neste filtro: todos os produtos ativos têm{' '}
              <span className="font-semibold">0 caixas</span> somadas no período.
            </p>
            <p className="text-xs text-amber-900/90 sm:text-sm">
              Marque <span className="font-semibold">Mostrar produtos sem quantidade em estoque</span> acima para
              listar também esses produtos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-3 py-2.5 font-semibold text-slate-800 sm:px-4 sm:py-3">
                    Produto
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold text-slate-800 sm:px-4 sm:py-3">
                    Código
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold text-slate-800 sm:px-4 sm:py-3">
                    Tipo de embalagem
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-semibold text-slate-800 sm:px-4 sm:py-3 tabular-nums"
                  >
                    Qtd. (caixas)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linhasVisiveis.map((row) => (
                  <tr key={row.produto_id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 text-slate-900 sm:px-4 sm:py-2.5">{row.nome}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-600 sm:px-4 sm:py-2.5">{row.codigo}</td>
                    <td className="px-3 py-2 text-slate-700 sm:px-4 sm:py-2.5">{row.tipo_embalagem}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-900 sm:px-4 sm:py-2.5">
                      {row.quantidade_caixas.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
