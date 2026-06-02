'use client';

import cn from 'classnames';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getOrdemProducaoDiariaLataPicker,
  getUnidadesCaixaPreviewOrdemDiaria,
  removeOrdemProducaoDiariaItem,
  type AssadeiraOpcaoOrdemProducao,
  type ClienteOrdemProducaoOpcao,
  type OrdemProducaoDiariaItemView,
} from '@/app/actions/producao-actions';
import type { TipoCaixaOrdemOpcao } from '@/app/actions/tipos-caixa-embalagem-actions';
import type { OrdemProducaoLataSelecao } from '@/domain/types/ordem-producao';
import { buildClientesPreview } from '@/lib/production/ordem-producao-rules';
import {
  estimateCaixasFromLatas,
  estimateLatasFromCaixas,
} from '@/lib/production/ordem-producao-conversions';
import { avaliarLataSplit } from '@/lib/production/latas-uso-resumo';
import ClientesOrdemPicklist from '@/components/Producao/ordem/ClientesOrdemPicklist';
import OrdemProducaoDividirModal, {
  type OrdemDividirParte,
} from '@/components/Producao/ordem/OrdemProducaoDividirModal';
import OrdemProducaoSelectableSumCell from '@/components/Producao/ordem/OrdemProducaoSelectableSumCell';
import type { OrdemCellSelectionApi } from '@/components/Producao/ordem/useOrdemProducaoCellSelection';

function mergeClientesLinha(gravados: string[], opcoes: ClienteOrdemProducaoOpcao[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of gravados) {
    const t = String(raw ?? '').trim();
    if (!t) continue;
    const hit = opcoes.find((o) => o.nomeFantasia.toLowerCase() === t.toLowerCase());
    const v = hit ? hit.nomeFantasia : t;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function linhaPermiteRemover(item: OrdemProducaoDiariaItemView): boolean {
  const s = String(item.statusLinha ?? '').toLowerCase();
  return s === 'rascunho' || s === 'pronto';
}

interface OrdemProducaoRowProps {
  item: OrdemProducaoDiariaItemView;
  ordemDiariaId: string;
  tiposCaixaOpcoes: TipoCaixaOrdemOpcao[];
  clientesOrdemOpcoes: ClienteOrdemProducaoOpcao[];
  onRemoveLineResult: (message: string | null) => void;
  onSave: (payload: {
    itemId: string;
    prioridade: number;
    produtoId: string;
    tipoLata: OrdemProducaoLataSelecao;
    latasPlanejadas: number;
    caixasEstimadas: number;
    clientes: string[];
    observacaoEmbalagem?: string | null;
    observacaoProducao?: string | null;
    tipoCaixaEmbalagemId?: string | null;
  }) => Promise<boolean>;
  saving: boolean;
  /** Modo edição completo (uma linha por vez na grelha). */
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  /** True quando outra linha está em edição (desativa «Editar» nesta). */
  editBlockedOnAnotherRow: boolean;
  /** Divide esta ordem em duas (atualiza a original e cria a 2ª parte). */
  onDividir?: (parte1: OrdemDividirParte, parte2: OrdemDividirParte) => Promise<boolean>;
  /** Soma interativa de latas / caixas (modo compacto). */
  cellSelection?: OrdemCellSelectionApi;
  /** Arrastar linha para reordenar prioridade (HTML5 DnD no ícone). */
  dragRow?: {
    isDragging: boolean;
    /** Indicador de inserção quando uma linha arrastada paira sobre esta. */
    dropIndicator?: 'before' | 'after' | null;
    /** Posição (1-based) que a linha arrastada assumirá ao soltar aqui. */
    novaPosicao?: number | null;
    onHandleDragStart: (e: React.DragEvent<HTMLSpanElement>) => void;
    onHandleDragEnd: (e: React.DragEvent<HTMLSpanElement>) => void;
    onDragOver: (e: React.DragEvent<HTMLTableRowElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLTableRowElement>) => void;
    onDrop: (e: React.DragEvent<HTMLTableRowElement>) => void;
  };
}

export default function OrdemProducaoRow({
  item,
  ordemDiariaId,
  tiposCaixaOpcoes,
  clientesOrdemOpcoes,
  onRemoveLineResult,
  onSave,
  saving,
  isEditing,
  onStartEdit,
  onCancelEdit,
  editBlockedOnAnotherRow,
  cellSelection,
  dragRow,
  onDividir,
}: OrdemProducaoRowProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [dividirOpen, setDividirOpen] = useState(false);
  const [dividindo, setDividindo] = useState(false);
  const [latasOpcoes, setLatasOpcoes] = useState<AssadeiraOpcaoOrdemProducao[]>([]);
  const [assadeiraId, setAssadeiraId] = useState('');
  const [boxUnitsProduto, setBoxUnitsProduto] = useState<number | null>(null);
  const [latasLoading, setLatasLoading] = useState(false);
  const [latasStr, setLatasStr] = useState(String(item.latasPlanejadas));
  const [caixasStr, setCaixasStr] = useState(String(item.caixasEstimadas));
  const [ultimoEditado, setUltimoEditado] = useState<'latas' | 'caixas'>('latas');
  const [tipoCaixaId, setTipoCaixaId] = useState(item.tipoCaixaEmbalagemId ?? '');
  const [unidadesCaixaPreview, setUnidadesCaixaPreview] = useState<{
    unidadesPorCaixa: number | null;
    boxUnitsFallback: number | null;
  } | null>(null);
  const [obsEmb, setObsEmb] = useState(item.observacaoEmbalagem ?? '');
  const [obsPro, setObsPro] = useState(item.observacaoProducao ?? '');
  const [clientesSel, setClientesSel] = useState<string[]>(() =>
    mergeClientesLinha(item.clientes, clientesOrdemOpcoes),
  );

  const itemClientesKey = useMemo(() => item.clientes.join('\u0001'), [item.clientes]);

  useEffect(() => {
    if (isEditing) return;
    setClientesSel(mergeClientesLinha(item.clientes, clientesOrdemOpcoes));
  }, [isEditing, item.id, itemClientesKey, clientesOrdemOpcoes]);

  useEffect(() => {
    if (isEditing) return;
    setLatasStr(String(item.latasPlanejadas));
    setCaixasStr(String(item.caixasEstimadas));
    setUltimoEditado('latas');
    setTipoCaixaId(item.tipoCaixaEmbalagemId?.trim() ?? '');
    setObsEmb(item.observacaoEmbalagem ?? '');
    setObsPro(item.observacaoProducao ?? '');
  }, [
    isEditing,
    item.id,
    item.latasPlanejadas,
    item.caixasEstimadas,
    item.tipoCaixaEmbalagemId,
    item.observacaoEmbalagem,
    item.observacaoProducao,
  ]);

  const prevIsEditing = useRef(isEditing);
  useEffect(() => {
    const opened = isEditing && !prevIsEditing.current;
    prevIsEditing.current = isEditing;
    if (!opened) return;
    setLatasStr(String(item.latasPlanejadas));
    setCaixasStr(String(item.caixasEstimadas));
    setUltimoEditado('latas');
    setTipoCaixaId(item.tipoCaixaEmbalagemId?.trim() ?? '');
    setObsEmb(item.observacaoEmbalagem ?? '');
    setObsPro(item.observacaoProducao ?? '');
    setClientesSel(mergeClientesLinha(item.clientes, clientesOrdemOpcoes));
  }, [
    isEditing,
    item.id,
    item.latasPlanejadas,
    item.caixasEstimadas,
    item.tipoCaixaEmbalagemId,
    item.observacaoEmbalagem,
    item.observacaoProducao,
    item.clientes,
    clientesOrdemOpcoes,
  ]);

  useEffect(() => {
    let cancelled = false;
    const pid = item.produtoId?.trim() ?? '';
    if (!pid) {
      setLatasOpcoes([]);
      setAssadeiraId('');
      setBoxUnitsProduto(null);
      return;
    }
    setLatasLoading(true);
    void (async () => {
      const r = await getOrdemProducaoDiariaLataPicker(pid, item.tipoLata);
      if (cancelled) return;
      setLatasLoading(false);
      if (!r.success) {
        setLatasOpcoes([]);
        setAssadeiraId('');
        setBoxUnitsProduto(null);
        return;
      }
      setLatasOpcoes(r.options);
      setBoxUnitsProduto(r.boxUnits);
      const sel = r.selectedAssadeiraId ?? r.options[0]?.id ?? '';
      setAssadeiraId(sel);
    })();
    return () => {
      cancelled = true;
    };
  }, [item.produtoId, item.tipoLata, item.id]);

  useEffect(() => {
    if (!isEditing) {
      setUnidadesCaixaPreview(null);
      return;
    }
    let cancelled = false;
    const pid = item.produtoId?.trim() ?? '';
    if (!pid) {
      setUnidadesCaixaPreview(null);
      return;
    }
    void (async () => {
      const r = await getUnidadesCaixaPreviewOrdemDiaria(pid, tipoCaixaId.trim() || null);
      if (cancelled) return;
      if (!r.success) {
        setUnidadesCaixaPreview(null);
        return;
      }
      setUnidadesCaixaPreview({
        unidadesPorCaixa: r.unidadesPorCaixa,
        boxUnitsFallback: r.boxUnitsFallback,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditing, item.produtoId, tipoCaixaId]);

  const lataSel = useMemo(
    () => latasOpcoes.find((o) => o.id === assadeiraId) ?? null,
    [latasOpcoes, assadeiraId],
  );

  const convParams = useMemo(() => {
    const upc =
      unidadesCaixaPreview?.unidadesPorCaixa != null && unidadesCaixaPreview.unidadesPorCaixa > 0
        ? unidadesCaixaPreview.unidadesPorCaixa
        : null;
    const buf = upc != null ? null : (unidadesCaixaPreview?.boxUnitsFallback ?? boxUnitsProduto);
    return {
      numeroBuracosAssadeira: lataSel?.numero_buracos,
      unidadesPorAssadeiraCadastro: lataSel?.unidades_por_assadeira,
      unidadesPorCaixa: upc,
      boxUnits: buf,
    };
  }, [lataSel, unidadesCaixaPreview, boxUnitsProduto]);

  const parseNum = (v: string) => Math.max(0, Number(String(v).replace(',', '.')) || 0);

  const calcularCaixas = useCallback(
    (latasNum: number) => estimateCaixasFromLatas({ latas: latasNum, ...convParams }),
    [convParams],
  );
  const calcularLatas = useCallback(
    (caixasNum: number) => estimateLatasFromCaixas({ caixas: caixasNum, ...convParams }),
    [convParams],
  );

  const onLatasChange = (v: string) => {
    setLatasStr(v);
    setUltimoEditado('latas');
    setCaixasStr(String(calcularCaixas(parseNum(v))));
  };
  const onCaixasChange = (v: string) => {
    setCaixasStr(v);
    setUltimoEditado('caixas');
    setLatasStr(String(calcularLatas(parseNum(v))));
  };

  // Recalcula o campo derivado quando o cadastro de lata/caixa termina de carregar.
  useEffect(() => {
    if (!isEditing) return;
    if (ultimoEditado === 'latas') {
      setCaixasStr(String(calcularCaixas(parseNum(latasStr))));
    } else {
      setLatasStr(String(calcularLatas(parseNum(caixasStr))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convParams, ultimoEditado, isEditing]);

  const lataSplitAviso = useMemo(() => {
    const latasNum = isEditing
      ? parseNum(latasStr)
      : Math.max(0, Math.round(Number(item.latasPlanejadas) || 0));
    return avaliarLataSplit(latasNum, lataSel?.quantidade_latas ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, latasStr, item.latasPlanejadas, lataSel]);

  const clientesResumo = buildClientesPreview(clientesSel);
  const busy = saving || removing || (isEditing && latasLoading);
  const busyView = saving || removing;
  const podeRemover = linhaPermiteRemover(item) && ordemDiariaId.trim().length > 0;
  const lataSelectDisabled = busy || latasOpcoes.length === 0;

  const trDnDProps = dragRow
    ? {
        onDragOver: dragRow.onDragOver,
        onDragLeave: dragRow.onDragLeave,
        onDrop: dragRow.onDrop,
      }
    : {};
  const trDnDClass = cn(
    dragRow?.isDragging && 'opacity-40',
    dragRow?.dropIndicator === 'before' && 'shadow-[inset_0_3px_0_0_#8b5cf6]',
    dragRow?.dropIndicator === 'after' && 'shadow-[inset_0_-3px_0_0_#8b5cf6]',
  );
  const novaPosicaoBadge =
    dragRow?.dropIndicator && dragRow.novaPosicao != null ? dragRow.novaPosicao : null;

  const handleRemove = async () => {
    if (!podeRemover) return;
    onRemoveLineResult(null);
    setRemoving(true);
    const r = await removeOrdemProducaoDiariaItem(ordemDiariaId.trim(), item.id);
    setRemoving(false);
    if (!r.success) {
      onRemoveLineResult(r.error);
      return;
    }
    router.refresh();
  };

  const podeDividir = Boolean(onDividir) && linhaPermiteRemover(item) && lataSplitAviso.excede;

  const handleDividir = async (parte1: OrdemDividirParte, parte2: OrdemDividirParte) => {
    if (!onDividir) return false;
    setDividindo(true);
    const ok = await onDividir(parte1, parte2);
    setDividindo(false);
    if (ok) setDividirOpen(false);
    return ok;
  };

  const handleSalvarLinha = async () => {
    const latas = Math.round(Number(String(latasStr).replace(',', '.')));
    if (!Number.isFinite(latas) || latas < 0) {
      window.alert('Informe latas planejadas (número inteiro ≥ 0).');
      return;
    }
    if (!assadeiraId.trim()) {
      window.alert('Selecione uma lata cadastrada para este produto.');
      return;
    }
    await onSave({
      itemId: item.id,
      prioridade: item.prioridade,
      produtoId: item.produtoId,
      tipoLata: assadeiraId.trim(),
      latasPlanejadas: latas,
      caixasEstimadas: Math.max(0, Math.round(parseNum(caixasStr))),
      clientes: clientesSel,
      observacaoEmbalagem: obsEmb.trim() || null,
      observacaoProducao: obsPro.trim() || null,
      tipoCaixaEmbalagemId: tipoCaixaId.trim() || null,
    });
  };

  const lataNomeVisual =
    lataSel?.nome ??
    (latasLoading ? '…' : item.tipoLata.trim().length >= 8 ? `${item.tipoLata.slice(0, 8)}…` : '—');

  const tipoCaixaVisual =
    item.tipoCaixaResumo?.trim() ||
    (item.tipoCaixaEmbalagemId ? 'Tipo de caixa (ver edição)' : 'Padrão (box_units)');

  const dividirModal =
    dividirOpen && typeof document !== 'undefined'
      ? createPortal(
          <OrdemProducaoDividirModal
            open={dividirOpen}
            onClose={() => {
              if (!dividindo) setDividirOpen(false);
            }}
            produtoNome={item.produtoNome}
            lataNome={lataNomeVisual}
            totalLatas={Math.max(0, Math.round(Number(item.latasPlanejadas) || 0))}
            totalCaixas={Math.max(0, Math.round(Number(item.caixasEstimadas) || 0))}
            disponivel={lataSel?.quantidade_latas ?? 0}
            observacaoProducaoOriginal={item.observacaoProducao ?? null}
            observacaoEmbalagemOriginal={item.observacaoEmbalagem ?? null}
            saving={dividindo}
            onConfirm={handleDividir}
          />,
          document.body,
        )
      : null;

  if (!isEditing) {
    const obsEmbVer = item.observacaoEmbalagem?.trim();
    const obsProVer = item.observacaoProducao?.trim();
    const clientesVisual = buildClientesPreview(
      mergeClientesLinha(item.clientes, clientesOrdemOpcoes),
    );
    return (
      <tr
        className={cn('border-b border-slate-100 bg-white align-top', trDnDClass)}
        {...trDnDProps}
      >
        <td className="px-2 py-1.5 text-center">
          <div className="flex items-center justify-center gap-0.5">
            {dragRow ? (
              <span
                draggable
                onDragStart={dragRow.onHandleDragStart}
                onDragEnd={dragRow.onHandleDragEnd}
                className="material-icons shrink-0 cursor-grab text-base leading-none text-slate-400 active:cursor-grabbing"
                title="Arrastar para mudar prioridade"
                aria-hidden
              >
                drag_indicator
              </span>
            ) : null}
            <span className="text-sm tabular-nums text-slate-800">{item.prioridade}</span>
            {novaPosicaoBadge != null ? (
              <span className="ml-0.5 inline-flex items-center rounded bg-violet-600 px-1 py-0.5 text-[10px] font-bold leading-none text-white">
                → {novaPosicaoBadge}
              </span>
            ) : null}
          </div>
        </td>
        <td className="max-w-[14rem] px-2 py-1.5 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-slate-900">{item.produtoNome}</span>
            {item.loteCodigo ? (
              <span className="text-[11px] text-slate-500" title="Lote da OP vinculada">
                {item.loteCodigo}
              </span>
            ) : null}
          </div>
        </td>
        <td className="max-w-[11rem] px-2 py-1.5 text-xs text-slate-800" title={item.tipoLata}>
          <span className="line-clamp-2">{lataNomeVisual}</span>
        </td>
        <td className="max-w-[14rem] px-2 py-1.5 text-xs text-slate-700">
          <span className="line-clamp-2">{tipoCaixaVisual}</span>
        </td>
        <OrdemProducaoSelectableSumCell
          itemId={item.id}
          column="latas"
          selection={cellSelection}
          className="px-2 py-1.5 text-sm tabular-nums text-slate-800"
        >
          <div className="flex flex-col gap-0.5">
            <span>{item.latasPlanejadas}</span>
            {lataSplitAviso.excede ? (
              podeDividir ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDividirOpen(true);
                  }}
                  disabled={busyView}
                  className="inline-flex w-fit items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-60"
                  title={`Só há ${lataSplitAviso.disponivel} latas cadastradas deste tipo. Clique para dividir esta ordem em 2.`}
                >
                  ⚠ Dividir ordem
                </button>
              ) : (
                <span
                  className="inline-flex w-fit items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800"
                  title={`Só há ${lataSplitAviso.disponivel} latas cadastradas deste tipo. Considere dividir em ${lataSplitAviso.lotesSugeridos} lotes.`}
                >
                  ⚠ dividir em {lataSplitAviso.lotesSugeridos}
                </span>
              )
            ) : null}
          </div>
        </OrdemProducaoSelectableSumCell>
        <OrdemProducaoSelectableSumCell
          itemId={item.id}
          column="caixas"
          selection={cellSelection}
          className="px-2 py-1.5 text-sm tabular-nums text-slate-800"
        >
          {item.caixasEstimadas}
        </OrdemProducaoSelectableSumCell>
        <td className="max-w-[14rem] px-2 py-1.5 text-xs text-slate-700">
          <p className="line-clamp-3 break-words" title={clientesVisual}>
            {item.clientes.length ? clientesVisual : '—'}
          </p>
        </td>
        <td className="max-w-[12rem] px-2 py-1.5 text-xs text-slate-600">
          <p className="line-clamp-2 whitespace-pre-wrap break-words" title={obsEmbVer ?? ''}>
            {obsEmbVer || '—'}
          </p>
        </td>
        <td className="max-w-[12rem] px-2 py-1.5 text-xs text-slate-600">
          <p className="line-clamp-2 whitespace-pre-wrap break-words" title={obsProVer ?? ''}>
            {obsProVer || '—'}
          </p>
        </td>
        <td className="whitespace-nowrap px-2 py-1.5 text-xs text-slate-500">
          {item.statusLinha?.trim() ? item.statusLinha : '—'}
        </td>
        <td className="px-2 py-1.5 text-xs">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={busyView || editBlockedOnAnotherRow}
              title={
                editBlockedOnAnotherRow
                  ? 'Termine ou cancele a edição na outra linha primeiro.'
                  : undefined
              }
              className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-45"
              onClick={onStartEdit}
            >
              Editar
            </button>
            <button
              type="button"
              disabled={busyView || !podeRemover}
              title={
                !podeRemover
                  ? 'Só é possível remover linhas em rascunho ou prontas (antes da produção).'
                  : undefined
              }
              className="rounded border border-rose-200 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              onClick={() => void handleRemove()}
            >
              {removing ? 'Removendo…' : 'Remover'}
            </button>
          </div>
          {dividirModal}
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={cn('border-b border-slate-100 bg-white', trDnDClass)}
      {...trDnDProps}
    >
      <td className="px-2 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          {dragRow ? (
            <span
              draggable
              onDragStart={dragRow.onHandleDragStart}
              onDragEnd={dragRow.onHandleDragEnd}
              className="material-icons shrink-0 cursor-grab text-lg leading-none text-slate-400 active:cursor-grabbing"
              title="Arrastar para mudar prioridade"
              aria-hidden
            >
              drag_indicator
            </span>
          ) : null}
          <span className="text-sm tabular-nums text-slate-800">{item.prioridade}</span>
          {novaPosicaoBadge != null ? (
            <span className="ml-0.5 inline-flex items-center rounded bg-violet-600 px-1 py-0.5 text-[10px] font-bold leading-none text-white">
              → {novaPosicaoBadge}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-2 py-2 text-sm">
        <div className="flex flex-col">
          <span>{item.produtoNome}</span>
          {item.loteCodigo && (
            <span className="text-xs text-slate-500" title="Lote da OP vinculada">
              {item.loteCodigo}
            </span>
          )}
          {item.tipoCaixaResumo && (
            <span className="text-[10px] text-slate-500" title="Tipo de caixa gravado">
              Caixa: {item.tipoCaixaResumo}
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-2">
        <select
          value={assadeiraId}
          className="w-full min-w-[10rem] rounded border px-2 py-1 text-sm"
          onChange={(e) => setAssadeiraId(e.target.value)}
          disabled={lataSelectDisabled}
          aria-label="Lata (cadastro)"
          aria-busy={latasLoading}
        >
          {latasOpcoes.length === 0 ? (
            <option value="">{latasLoading ? 'A carregar…' : 'Sem latas no cadastro'}</option>
          ) : (
            latasOpcoes.map((o) => {
              const br = Math.round(Number(o.numero_buracos ?? 0));
              const hint =
                br > 0 ? `${br} un./lata (buracos)` : `${o.unidades_por_assadeira} un./lata (cadastro)`;
              return (
                <option key={o.id} value={o.id}>
                  {o.nome} — {hint}
                </option>
              );
            })
          )}
        </select>
      </td>
      <td className="px-2 py-2">
        <select
          value={tipoCaixaId}
          className="w-full min-w-[9rem] max-w-[16rem] rounded border px-2 py-1 text-xs"
          onChange={(e) => setTipoCaixaId(e.target.value)}
          disabled={busy}
          aria-label="Tipo de caixa"
        >
          <option value="">Padrão do produto (box_units)</option>
          {tiposCaixaOpcoes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} ({t.clienteNome}) — {t.unidadesPorCaixa} un./cx
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={0}
          step={1}
          className="w-full min-w-[4.5rem] rounded border px-2 py-1 text-sm tabular-nums"
          value={latasStr}
          onChange={(e) => onLatasChange(e.target.value)}
          disabled={busy}
          aria-label="Latas planejadas"
        />
        {lataSplitAviso.excede ? (
          <span
            className="mt-0.5 block text-[10px] font-medium text-amber-700"
            title={`Só há ${lataSplitAviso.disponivel} latas cadastradas deste tipo.`}
          >
            Dividir em {lataSplitAviso.lotesSugeridos} lotes (estoque {lataSplitAviso.disponivel})
          </span>
        ) : null}
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={0}
          step={1}
          className="w-full min-w-[4.5rem] rounded border px-2 py-1 text-sm tabular-nums"
          value={caixasStr}
          onChange={(e) => onCaixasChange(e.target.value)}
          disabled={busy}
          aria-label="Caixas estimadas"
        />
        <span className="text-[10px] text-slate-400">latas ou caixas — calcula o outro</span>
      </td>
      <td
        className="min-w-[13rem] max-w-[15rem] align-top px-2 py-2"
        title={clientesSel.length ? clientesSel.join(', ') : undefined}
      >
        <ClientesOrdemPicklist
          opcoes={clientesOrdemOpcoes}
          value={clientesSel}
          onChange={setClientesSel}
          disabled={busy}
          compact
          single
        />
        {clientesSel.length > 0 && (
          <p className="mt-1 text-[10px] text-slate-500 truncate" title={clientesSel.join(', ')}>
            {clientesResumo}
          </p>
        )}
      </td>
      <td className="max-w-[14rem] px-2 py-2 align-top">
        <textarea
          rows={2}
          maxLength={500}
          className="box-border min-h-[4.25rem] w-full min-w-0 rounded border px-2 py-1 text-xs text-slate-800"
          value={obsEmb}
          onChange={(e) => setObsEmb(e.target.value)}
          disabled={busy}
          placeholder="Embalagem"
          aria-label="Observação embalagem"
        />
      </td>
      <td className="max-w-[14rem] px-2 py-2 align-top">
        <textarea
          rows={2}
          maxLength={500}
          className="box-border min-h-[4.25rem] w-full min-w-0 rounded border px-2 py-1 text-xs text-slate-800"
          value={obsPro}
          onChange={(e) => setObsPro(e.target.value)}
          disabled={busy}
          placeholder="Produção"
          aria-label="Observação produção"
        />
      </td>
      <td className="px-2 py-2 text-xs text-slate-500">
        {item.statusLinha?.trim() ? item.statusLinha : '—'}
      </td>
      <td className="px-2 py-2 text-xs">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={busy}
            className="rounded border border-emerald-700 bg-emerald-700 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            onClick={() => void handleSalvarLinha()}
          >
            Salvar
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            onClick={onCancelEdit}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || !podeRemover}
            title={
              !podeRemover
                ? 'Só é possível remover linhas em rascunho ou prontas (antes da produção).'
                : undefined
            }
            className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            onClick={() => void handleRemove()}
          >
            {removing ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </td>
    </tr>
  );
}
