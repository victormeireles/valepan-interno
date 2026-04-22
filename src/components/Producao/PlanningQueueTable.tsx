'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  cancelProductionOrder,
  reorderProductionPlanningOrders,
} from '@/app/actions/producao-actions';
import {
  compareProductionQueuePlanningOrder,
  ordemProntaNaEtapaFila,
} from '@/components/Producao/queue/production-queue-metrics';
import { formatIsoDateToDDMMYYYY } from '@/lib/utils/date-utils';
import { getQuantityByStation } from '@/lib/utils/production-conversions';

export interface PlanningQueueItem {
  id: string;
  lote_codigo: string;
  produto_id: string;
  qtd_planejada: number;
  status?: string | null;
  data_producao?: string | null;
  ordem_planejamento?: number | null;
  produtoJoinFaltando?: boolean;
  produtos: {
    nome: string;
    unidadeNomeResumido: string | null;
    package_units?: number | null;
    box_units?: number | null;
    unidades_assadeira?: number | null;
    receita_massa?: { quantidade_por_produto: number } | null;
  };
  pedidos?: {
    cliente_id: string;
    clientes?: { nome_fantasia: string };
  } | null;
  /** Resumo da planilha de estoque (cliente + produto). */
  estoque_resumo?: string | null;
  qtd_a_produzir_planejada?: number;
}

interface PlanningQueueTableProps {
  items: PlanningQueueItem[];
  onEdit: (item: PlanningQueueItem) => void;
}

function isPlanejado(item: PlanningQueueItem): boolean {
  return item.status == null || item.status === 'planejado';
}

function formatDay(dateString?: string | null): string {
  if (!dateString) return '—';
  return formatIsoDateToDDMMYYYY(dateString) || '—';
}

function qtdPlanejamentoParaExibicao(item: PlanningQueueItem): number {
  return item.qtd_a_produzir_planejada ?? item.qtd_planejada;
}

function quantidadesResumoPlanejamento(item: PlanningQueueItem): string {
  const q = getQuantityByStation('planejamento', qtdPlanejamentoParaExibicao(item), item.produtos);
  const partes: string[] = [q.readable];
  if (q.receitas) partes.push(q.receitas.readable);
  if (q.assadeiras) partes.push(q.assadeiras.readable);
  return partes.join(' · ');
}

/** Quantidade pedida na OP (`qtd_planejada`), antes do desconto de estoque. */
function quantidadesResumoPedido(item: PlanningQueueItem): string {
  const q = getQuantityByStation('planejamento', item.qtd_planejada, item.produtos);
  const partes: string[] = [q.readable];
  if (q.receitas) partes.push(q.receitas.readable);
  if (q.assadeiras) partes.push(q.assadeiras.readable);
  return partes.join(' · ');
}

const thBase =
  'sticky top-0 z-10 border-b border-gray-200 bg-slate-100 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm';
const tdBase = 'border-b border-gray-100 px-3 py-2.5 align-middle text-sm text-gray-900';

export default function PlanningQueueTable({ items, onEdit }: PlanningQueueTableProps) {
  const router = useRouter();
  const [excluindoOrdemId, setExcluindoOrdemId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);

  const { planejados, emAndamento } = useMemo(() => {
    const p: PlanningQueueItem[] = [];
    const o: PlanningQueueItem[] = [];
    for (const it of items) {
      if (isPlanejado(it)) p.push(it);
      else o.push(it);
    }
    return { planejados: p, emAndamento: o };
  }, [items]);

  const planejadosPendentes = useMemo(
    () => planejados.filter((i) => !ordemProntaNaEtapaFila(i, 'planejamento')),
    [planejados],
  );
  const planejadosProntos = useMemo(
    () => planejados.filter((i) => ordemProntaNaEtapaFila(i, 'planejamento')),
    [planejados],
  );
  const planejadosProntosSorted = useMemo(
    () => [...planejadosProntos].sort(compareProductionQueuePlanningOrder),
    [planejadosProntos],
  );

  const [ordemLocal, setOrdemLocal] = useState<PlanningQueueItem[]>(planejadosPendentes);
  const pendentesIds = planejadosPendentes.map((x) => x.id).join('|');

  useEffect(() => {
    setOrdemLocal(planejadosPendentes);
  }, [pendentesIds]);

  const persistOrder = useCallback(
    async (nextRows: PlanningQueueItem[]) => {
      setPersistError(null);
      const ids = [...nextRows.map((r) => r.id), ...planejadosProntosSorted.map((r) => r.id)];
      try {
        const result = await reorderProductionPlanningOrders(ids);
        if (!result.success) {
          setPersistError(result.error);
          setOrdemLocal(planejadosPendentes);
          return;
        }
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setPersistError(
          /failed to fetch/i.test(msg)
            ? 'Sem ligação ao servidor (Failed to fetch). Confirme que o Next está a correr e que abre o site na mesma porta (ex.: :3001).'
            : `Erro ao guardar a ordem: ${msg}`,
        );
        setOrdemLocal(planejadosPendentes);
      }
    },
    [planejadosPendentes, planejadosProntosSorted, router],
  );

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const onDragOverRow = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggingId && draggingId !== targetId) setDragOverId(targetId);
  };

  const onDropRow = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const dragId = e.dataTransfer.getData('text/plain') || draggingId;
    setDragOverId(null);
    setDraggingId(null);
    if (!dragId || dragId === targetId) return;

    setOrdemLocal((prev) => {
      const from = prev.findIndex((r) => r.id === dragId);
      const to = prev.findIndex((r) => r.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      queueMicrotask(() => {
        void persistOrder(next);
      });
      return next;
    });
  };

  const renderRow = (
    item: PlanningQueueItem,
    indexDisplay: number | null,
    opts: { draggable: boolean },
  ) => {
    const qProduzir = getQuantityByStation(
      'planejamento',
      qtdPlanejamentoParaExibicao(item),
      item.produtos,
    );
    const qPedido = getQuantityByStation('planejamento', item.qtd_planejada, item.produtos);
    const avisoReceita =
      qProduzir.receitas?.hasWarning ||
      qProduzir.hasWarning ||
      qPedido.receitas?.hasWarning ||
      qPedido.hasWarning;

    return (
      <tr
        key={item.id}
        draggable={opts.draggable}
        onDragStart={opts.draggable ? (e) => onDragStart(e, item.id) : undefined}
        onDragEnd={opts.draggable ? onDragEnd : undefined}
        onDragOver={opts.draggable ? (e) => onDragOverRow(e, item.id) : undefined}
        onDrop={opts.draggable ? (e) => onDropRow(e, item.id) : undefined}
        className={`bg-white transition-colors ${
          opts.draggable ? 'cursor-grab active:cursor-grabbing' : ''
        } ${draggingId === item.id ? 'opacity-50' : ''} ${
          dragOverId === item.id ? 'ring-2 ring-inset ring-blue-400' : ''
        } ${item.produtoJoinFaltando ? 'bg-rose-50/50' : ''}`}
      >
        <td className={`${tdBase} w-12 text-center font-semibold tabular-nums text-slate-700`}>
          {indexDisplay != null ? indexDisplay : '—'}
        </td>
        <td className={`${tdBase} w-10 text-slate-400`}>
          {opts.draggable ? (
            <span className="material-icons text-lg select-none" aria-hidden>
              drag_indicator
            </span>
          ) : (
            <span className="inline-block w-6" />
          )}
        </td>
        <td className={`${tdBase} font-mono text-xs text-slate-600 whitespace-nowrap`}>
          {item.lote_codigo}
        </td>
        <td className={`${tdBase} min-w-[10rem] font-medium`}>{item.produtos.nome}</td>
        <td
          className={`${tdBase} min-w-[12rem] text-slate-700`}
          title="Quantidade da ordem de produção / pedido (sem descontar estoque)"
        >
          {quantidadesResumoPedido(item)}
        </td>
        <td className={`${tdBase} min-w-[9rem] text-slate-700`} title="Planilha de estoque (cliente + produto)">
          {item.estoque_resumo ?? '—'}
        </td>
        <td
          className={`${tdBase} min-w-[12rem] text-slate-700`}
          title="Necessidade da OP menos estoque (o que falta produzir)"
        >
          {quantidadesResumoPlanejamento(item)}
        </td>
        <td className={`${tdBase} tabular-nums whitespace-nowrap`}>{formatDay(item.data_producao)}</td>
        <td className={`${tdBase} max-w-[10rem] truncate text-slate-600`}>
          {item.pedidos?.clientes?.nome_fantasia ?? '—'}
        </td>
        <td className={`${tdBase} text-center`}>
          {avisoReceita ? (
            <span className="material-icons text-amber-500 text-lg" title="Checar receita / cadastro">
              warning
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
        <td className={`${tdBase} whitespace-nowrap`}>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <span className="material-icons text-sm">edit</span>
              Editar
            </button>
            {isPlanejado(item) && (
              <button
                type="button"
                disabled={excluindoOrdemId !== null}
                onClick={async () => {
                  const ok = window.confirm(
                    `Excluir ${item.lote_codigo} (${item.produtos.nome})? A ordem será cancelada.`,
                  );
                  if (!ok) return;
                  setExcluindoOrdemId(item.id);
                  try {
                    const r = await cancelProductionOrder(item.id);
                    if (!r.success) window.alert(r.error);
                    else router.refresh();
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    window.alert(
                      /failed to fetch/i.test(msg)
                        ? 'Sem ligação ao servidor (Failed to fetch). Confirme que o Next está a correr e a mesma porta na barra de endereço.'
                        : `Erro ao excluir: ${msg}`,
                    );
                  } finally {
                    setExcluindoOrdemId(null);
                  }
                }}
                aria-label="Excluir ordem"
                title="Excluir ordem"
                className="inline-flex items-center justify-center rounded-lg border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                <span className="material-icons text-lg leading-none" aria-hidden>
                  {excluindoOrdemId === item.id ? 'hourglass_empty' : 'delete_outline'}
                </span>
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {persistError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          {persistError}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-slate-50/90 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Planejamento — ordem de produção</h2>
          <p className="mt-1 text-sm text-gray-600">
            Arraste as linhas para definir a sequência (1º = produzir primeiro). O cabeçalho permanece
            visível ao rolar a tabela.
          </p>
        </div>
        <div className="max-h-[min(70vh,560px)] overflow-auto overscroll-contain">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr>
                <th className={`${thBase} w-12 text-center`}>Ordem</th>
                <th className={`${thBase} w-10`} aria-label="Arrastar" />
                <th className={`${thBase} whitespace-nowrap`}>Lote</th>
                <th className={thBase}>Produto</th>
                <th className={thBase}>Pedido</th>
                <th className={thBase}>Estoque</th>
                <th className={thBase}>A produzir</th>
                <th className={`${thBase} whitespace-nowrap`}>Data prod.</th>
                <th className={thBase}>Cliente</th>
                <th className={`${thBase} text-center w-14`}>!</th>
                <th className={`${thBase} text-right whitespace-nowrap`}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {ordemLocal.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                    {planejadosProntosSorted.length > 0
                      ? 'Nenhuma ordem pendente de definição — todas já estão definidas (veja a secção abaixo).'
                      : 'Nenhuma ordem em planejamento. Use &quot;Nova Ordem&quot; para incluir.'}
                  </td>
                </tr>
              ) : (
                ordemLocal.map((item, i) => renderRow(item, i + 1, { draggable: true }))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {planejadosProntosSorted.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-emerald-50/60 px-4 py-3">
            <h2 className="text-base font-semibold text-gray-900">Definidos — prontos para produzir</h2>
            <p className="mt-1 text-sm text-gray-600">
              Data de produção e quantidade já definidas; continuam em planejamento até iniciar a massa.
            </p>
          </div>
          <div className="max-h-[min(50vh,400px)] overflow-auto overscroll-contain">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr>
                  <th className={`${thBase} w-12 text-center`}>Ordem</th>
                  <th className={`${thBase} w-10`} />
                  <th className={`${thBase} whitespace-nowrap`}>Lote</th>
                  <th className={thBase}>Produto</th>
                  <th className={thBase}>Pedido</th>
                  <th className={thBase}>Estoque</th>
                  <th className={thBase}>A produzir</th>
                  <th className={`${thBase} whitespace-nowrap`}>Data prod.</th>
                  <th className={thBase}>Cliente</th>
                  <th className={`${thBase} text-center w-14`}>!</th>
                  <th className={`${thBase} text-right whitespace-nowrap`}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {planejadosProntosSorted.map((item) => renderRow(item, null, { draggable: false }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {emAndamento.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-amber-50/80 px-4 py-3">
            <h2 className="text-base font-semibold text-gray-900">Em produção</h2>
            <p className="mt-1 text-sm text-gray-600">
              Ordens que já saíram do planejamento (não podem ser reordenadas aqui).
            </p>
          </div>
          <div className="max-h-[min(40vh,320px)] overflow-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr>
                  <th className={`${thBase} w-12 text-center`}>Ordem</th>
                  <th className={`${thBase} w-10`} />
                  <th className={`${thBase} whitespace-nowrap`}>Lote</th>
                  <th className={thBase}>Produto</th>
                  <th className={thBase}>Pedido</th>
                  <th className={thBase}>Estoque</th>
                  <th className={thBase}>A produzir</th>
                  <th className={`${thBase} whitespace-nowrap`}>Data prod.</th>
                  <th className={thBase}>Cliente</th>
                  <th className={`${thBase} text-center w-14`}>!</th>
                  <th className={`${thBase} text-right whitespace-nowrap`}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {emAndamento.map((item) => renderRow(item, null, { draggable: false }))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
