'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { removeOrdemProducaoDiariaItem, type OrdemProducaoDiariaItemView } from '@/app/actions/producao-actions';
import { ORDEM_PRODUCAO_TIPOS_LATA, type OrdemProducaoTipoLata } from '@/domain/types/ordem-producao';
import { buildClientesPreview } from '@/lib/production/ordem-producao-rules';

function linhaPermiteRemover(item: OrdemProducaoDiariaItemView): boolean {
  const s = String(item.statusLinha ?? '').toLowerCase();
  return s === 'rascunho' || s === 'pronto';
}

interface OrdemProducaoRowProps {
  item: OrdemProducaoDiariaItemView;
  ordemDiariaId: string;
  onRemoveLineResult: (message: string | null) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSave: (payload: {
    itemId: string;
    prioridade: number;
    produtoId: string;
    tipoLata: OrdemProducaoTipoLata;
    latasPlanejadas: number;
    caixasEstimadas: number;
    clientes: string[];
    observacao?: string | null;
  }) => Promise<void> | void;
  saving: boolean;
}

export default function OrdemProducaoRow({
  item,
  ordemDiariaId,
  onRemoveLineResult,
  onMoveUp,
  onMoveDown,
  onSave,
  saving,
}: OrdemProducaoRowProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const clientesTexto = item.clientes.join(', ');
  const busy = saving || removing;
  const podeRemover = linhaPermiteRemover(item) && ordemDiariaId.trim().length > 0;

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

  return (
    <tr className="border-b border-slate-100 bg-white">
      <td className="px-2 py-2 text-center text-sm tabular-nums">{item.prioridade}</td>
      <td className="px-2 py-2">
        <div className="flex gap-1">
          <button type="button" onClick={onMoveUp} className="rounded border px-2 py-1 text-xs" disabled={busy}>
            ↑
          </button>
          <button type="button" onClick={onMoveDown} className="rounded border px-2 py-1 text-xs" disabled={busy}>
            ↓
          </button>
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
        </div>
      </td>
      <td className="px-2 py-2 text-xs text-slate-600">{item.produtoId}</td>
      <td className="px-2 py-2">
        <select
          defaultValue={item.tipoLata}
          className="w-full rounded border px-2 py-1 text-sm"
          onChange={(e) =>
            void onSave({
              itemId: item.id,
              prioridade: item.prioridade,
              produtoId: item.produtoId,
              tipoLata: e.target.value as OrdemProducaoTipoLata,
              latasPlanejadas: item.latasPlanejadas,
              caixasEstimadas: item.caixasEstimadas,
              clientes: item.clientes,
              observacao: item.observacao,
            })
          }
          disabled={busy}
        >
          {ORDEM_PRODUCAO_TIPOS_LATA.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2 text-sm tabular-nums">{item.latasPlanejadas}</td>
      <td className="px-2 py-2 text-sm tabular-nums">{item.caixasEstimadas}</td>
      <td className="px-2 py-2 text-xs text-slate-600" title={clientesTexto}>
        {buildClientesPreview(item.clientes)}
      </td>
      <td className="px-2 py-2 text-xs text-slate-500">{item.statusLinha}</td>
      <td className="px-2 py-2 text-xs">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={busy}
            className="rounded border border-slate-300 px-2 py-1 text-xs"
            onClick={() =>
              void onSave({
                itemId: item.id,
                prioridade: item.prioridade,
                produtoId: item.produtoId,
                tipoLata: item.tipoLata as OrdemProducaoTipoLata,
                latasPlanejadas: item.latasPlanejadas,
                caixasEstimadas: item.caixasEstimadas,
                clientes: item.clientes,
                observacao: item.observacao,
              })
            }
          >
            Salvar
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
