'use client';

import { useState } from 'react';
import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';
import InsumoCustoBadge from '@/components/Insumos/InsumoCustoBadge';
import {
  calcularCustoTotal,
  calcularGramas,
  formatarCustoPorUnidade,
  formatarMoeda,
  formatarValorLateral,
  resolveCustoInsumoMeta,
} from '@/components/Receitas/receita-ingrediente-format';
import { resolveInsumoCustoEstado } from '@/domain/insumos/insumo-custo-estado';
import { RECEITA_INGREDIENTE_QUANTIDADE_STEP } from '@/domain/receitas/receita-quantidade-constants';

export type ReceitaIngredienteFormItem = {
  tempId: string;
  id?: string;
  insumoId: string;
  insumoNome: string;
  unidadeDescricao?: string | null;
  custoUnitario?: number | null;
  quantidade: number;
};

type SwapPayload = Pick<
  ReceitaIngredienteFormItem,
  'insumoId' | 'insumoNome' | 'unidadeDescricao' | 'custoUnitario'
>;

type Props = {
  item: ReceitaIngredienteFormItem;
  usedInsumoIds: string[];
  onQuantidadeChange: (tempId: string, quantidade: number) => void;
  onSwap: (tempId: string, payload: SwapPayload) => void;
  onRemove: (tempId: string) => void;
};

function resolveUnidadeFromMeta(meta: Record<string, unknown> | undefined) {
  const resumido = meta?.unidade_nome_resumido ?? meta?.unidadeNomeResumido;
  return typeof resumido === 'string' ? resumido : null;
}

export default function ReceitaIngredienteRow({
  item,
  usedInsumoIds,
  onQuantidadeChange,
  onSwap,
  onRemove,
}: Props) {
  const [swapping, setSwapping] = useState(false);
  const [novoInsumoId, setNovoInsumoId] = useState('');
  const [novoInsumoNome, setNovoInsumoNome] = useState('');
  const [novoUnidade, setNovoUnidade] = useState<string | null>(null);
  const [novoCustoUnitario, setNovoCustoUnitario] = useState<number | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  const resetSwapState = () => {
    setNovoInsumoId('');
    setNovoInsumoNome('');
    setNovoUnidade(null);
    setNovoCustoUnitario(null);
    setSwapError(null);
  };

  const handleStartSwap = () => {
    resetSwapState();
    setSwapping(true);
  };

  const handleCancelSwap = () => {
    resetSwapState();
    setSwapping(false);
  };

  const handleConfirmSwap = () => {
    if (!novoInsumoId) {
      setSwapError('Selecione o novo insumo.');
      return;
    }
    if (usedInsumoIds.includes(novoInsumoId)) {
      setSwapError('Este insumo já está na receita.');
      return;
    }

    onSwap(item.tempId, {
      insumoId: novoInsumoId,
      insumoNome: novoInsumoNome || 'Ingrediente',
      unidadeDescricao: novoUnidade,
      custoUnitario: novoCustoUnitario,
    });
    resetSwapState();
    setSwapping(false);
  };

  const gramas = calcularGramas(item.quantidade, item.unidadeDescricao);
  const valorFormatado = formatarValorLateral(item.quantidade, item.unidadeDescricao);
  const custoTotal = calcularCustoTotal(item.quantidade, item.custoUnitario);
  const custoEstado = resolveInsumoCustoEstado(item.custoUnitario);

  if (swapping) {
    return (
      <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Trocar insumo</p>
          <p className="text-xs text-gray-600">
            Substituir <span className="font-medium">{item.insumoNome}</span> por outro
            insumo. A quantidade permanece a mesma.
          </p>
        </div>

        <SelectRemoteAutocomplete
          value={novoInsumoId}
          onChange={setNovoInsumoId}
          stage="insumos"
          placeholder="Buscar novo insumo..."
          label="Novo insumo"
          onOptionSelected={(option) => {
            setNovoInsumoNome(option?.label ?? '');
            const meta = option?.meta as Record<string, unknown> | undefined;
            setNovoUnidade(resolveUnidadeFromMeta(meta));
            setNovoCustoUnitario(resolveCustoInsumoMeta(meta));
            setSwapError(null);
          }}
        />

        {novoUnidade ? (
          <p className="text-xs text-gray-500">
            Unidade: <span className="font-semibold text-blue-600">{novoUnidade}</span>
          </p>
        ) : null}

        {swapError ? (
          <p className="text-sm text-rose-600" role="alert">
            {swapError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCancelSwap}
            className="inline-flex items-center rounded-xl border-2 border-gray-100 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-200 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmSwap}
            className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black"
          >
            Confirmar troca
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 md:flex-row md:items-center">
      <div className="flex-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">{item.insumoNome}</p>
            {item.unidadeDescricao ? (
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {item.unidadeDescricao}
              </span>
            ) : null}
          </div>
          <span className="text-xs text-gray-500">
            Padrão:{' '}
            {gramas !== null ? (
              <>
                {item.quantidade}
                {item.unidadeDescricao} /{' '}
                <span className="font-medium text-blue-600">{gramas}g</span>
              </>
            ) : (
              `${item.quantidade} ${item.unidadeDescricao || ''}`
            )}
          </span>
          {custoEstado === 'com_custo' ? (
            <span className="font-mono text-xs tabular-nums text-stone-600">
              {formatarCustoPorUnidade(item.custoUnitario as number, item.unidadeDescricao)}
            </span>
          ) : (
            <InsumoCustoBadge custoUnitario={item.custoUnitario} />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-28">
          <input
            type="number"
            min="0"
            step={RECEITA_INGREDIENTE_QUANTIDADE_STEP}
            value={item.quantidade}
            onChange={(e) =>
              onQuantidadeChange(item.tempId, parseFloat(e.target.value) || 0)
            }
            className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`Quantidade de ${item.insumoNome}`}
          />
        </div>

        {valorFormatado ? (
          <span className="inline-flex flex-shrink-0 items-center whitespace-nowrap rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            {valorFormatado}
          </span>
        ) : null}

        {custoTotal != null ? (
          <span className="inline-flex flex-shrink-0 items-center whitespace-nowrap rounded bg-amber-50 px-2 py-1 font-mono text-xs font-semibold tabular-nums text-amber-800">
            {formatarMoeda(custoTotal)}
          </span>
        ) : null}

        <button
          type="button"
          onClick={handleStartSwap}
          className="p-2 text-gray-400 transition-colors hover:text-amber-700"
          aria-label={`Trocar insumo ${item.insumoNome}`}
        >
          <span className="material-icons text-base">edit</span>
        </button>

        <button
          type="button"
          onClick={() => onRemove(item.tempId)}
          className="p-2 text-gray-400 transition-colors hover:text-rose-600"
          aria-label={`Remover ${item.insumoNome}`}
        >
          <span className="material-icons text-base">delete</span>
        </button>
      </div>
    </div>
  );
}
