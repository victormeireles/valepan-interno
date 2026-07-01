'use client';

import { useEffect, useState } from 'react';
import { previewRecalcEntradasVinculo } from '@/app/actions/insumo-estoque-actions';
import { Switch } from '@/components/ui/Switch';

type Props = {
  vinculoId: string;
  fatorOriginal: number;
  fatorNovo: string;
  insumoOriginalId: string;
  insumoAtualId: string;
  recalcular: boolean;
  onRecalcularChange: (value: boolean) => void;
  disabled?: boolean;
};

function parseFator(value: string): number | null {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function InsumoVinculoRecalcSection({
  vinculoId,
  fatorOriginal,
  fatorNovo,
  insumoOriginalId,
  insumoAtualId,
  recalcular,
  onRecalcularChange,
  disabled = false,
}: Props) {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [movimentosAfetados, setMovimentosAfetados] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState('');

  const fatorParsed = parseFator(fatorNovo);
  const fatorMudou = fatorParsed != null && fatorParsed !== fatorOriginal;
  const insumoMudou = insumoAtualId !== insumoOriginalId;
  const podeRecalcular = fatorMudou && !insumoMudou;

  useEffect(() => {
    if (!podeRecalcular && recalcular) {
      onRecalcularChange(false);
    }
  }, [podeRecalcular, recalcular, onRecalcularChange]);

  useEffect(() => {
    if (!podeRecalcular || fatorParsed == null) {
      setMovimentosAfetados(null);
      setPreviewError('');
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError('');

    previewRecalcEntradasVinculo(vinculoId, fatorParsed)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setPreviewError(result.error);
          setMovimentosAfetados(null);
          return;
        }
        setMovimentosAfetados(result.preview.movimentosCorrigidos);
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [vinculoId, fatorParsed, podeRecalcular]);

  if (!podeRecalcular) {
    return (
      <p className="text-xs text-stone-500">
        {insumoMudou
          ? 'Ao trocar o insumo, entradas anteriores permanecem no insumo original.'
          : 'Alteração vale para próximos recebimentos. Entradas já registradas não mudam.'}
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Switch
        checked={recalcular}
        onChange={onRecalcularChange}
        disabled={disabled || previewLoading}
        label="Recalcular entradas anteriores deste produto Omie"
      />

      {previewLoading ? (
        <p className="text-xs text-stone-600">Verificando entradas anteriores…</p>
      ) : previewError ? (
        <p className="text-xs text-rose-700">{previewError}</p>
      ) : movimentosAfetados != null ? (
        <p className="text-xs text-stone-700">
          {movimentosAfetados === 0
            ? 'Nenhuma entrada anterior precisa ser ajustada com este fator.'
            : `${movimentosAfetados} entrada${movimentosAfetados === 1 ? '' : 's'} será${movimentosAfetados === 1 ? '' : 'ão'} recalculada${movimentosAfetados === 1 ? '' : 's'} (saldo e custo do insumo atualizados).`}
        </p>
      ) : null}
    </div>
  );
}
