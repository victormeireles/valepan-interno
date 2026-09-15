'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import {
  getInsumoNfPresetRange,
  INSUMO_NF_CONSULTA_LIMITE,
  type InsumoNfPeriodoPreset,
} from '@/domain/insumos/insumo-nf-periodo';
import type { InsumoPendenciaNfsTarget } from '@/domain/insumos/insumo-pendencia-nfs-target';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import InsumoNfDetalheLista from '@/features/insumo-estoque/components/InsumoNfDetalheLista';
import InsumoNfPeriodoFiltro from '@/features/insumo-estoque/components/InsumoNfPeriodoFiltro';
import { useInsumoNfConsultaQuery } from '@/features/insumo-estoque/hooks/useInsumoNfConsultaQuery';

type Props = {
  isOpen: boolean;
  target: InsumoPendenciaNfsTarget | null;
  onClose: () => void;
};

export default function InsumoPendenciaNfsModal({ isOpen, target, onClose }: Props) {
  const titleId = useId();
  const [animating, setAnimating] = useState(false);
  const [presetAtivo, setPresetAtivo] = useState<InsumoNfPeriodoPreset | null>('7dias');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const { detalhes, loading, error, load, reset } = useInsumoNfConsultaQuery();

  useEffect(() => {
    if (isOpen && target) {
      const range = getInsumoNfPresetRange('7dias');
      setAnimating(true);
      setPresetAtivo('7dias');
      setDe(range.de);
      setAte(range.ate);
      return;
    }

    if (!isOpen) {
      const timer = setTimeout(() => {
        setAnimating(false);
        reset();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, target, reset]);

  useEffect(() => {
    if (!isOpen || !target || !de || !ate) return;
    void load(target, { de, ate });
  }, [isOpen, target, de, ate, load]);

  const resumo = useMemo(() => {
    const nfsDistintas = new Set(
      detalhes.map((item) => item.numeroNf).filter((numero): numero is string => Boolean(numero)),
    ).size;
    return {
      recebimentos: detalhes.length,
      nfsDistintas,
      truncado: detalhes.length >= INSUMO_NF_CONSULTA_LIMITE,
    };
  }, [detalhes]);

  if ((!isOpen && !animating) || !target) return null;

  const mostrarFornecedor = target.contexto.fornecedoresDistintos !== 1;
  const titulo = target.descricaoProduto || `Produto ${target.omieIdProduto}`;
  const recebimentosLabel =
    resumo.recebimentos === 1
      ? '1 recebimento'
      : `${resumo.recebimentos} recebimentos`;
  const nfsLabel = resumo.nfsDistintas === 1 ? '1 NF' : `${resumo.nfsDistintas} NFs`;

  const handlePreset = (preset: InsumoNfPeriodoPreset) => {
    const range = getInsumoNfPresetRange(preset);
    setPresetAtivo(preset);
    setDe(range.de);
    setAte(range.ate);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg transition-all duration-300 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
        }`}
      >
        <div className="shrink-0 border-b border-stone-100 px-5 py-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-3">
              <h2 id={titleId} className="text-lg font-bold tracking-tight text-stone-900">
                Notas fiscais
              </h2>
              <p className="mt-0.5 truncate text-sm text-stone-600">{titulo}</p>
              {!loading && !error ? (
                <p className="mt-1 font-mono text-xs tabular-nums text-stone-500">
                  {recebimentosLabel} • {nfsLabel}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="Fechar"
            >
              <span className="material-icons" aria-hidden="true">
                close
              </span>
            </button>
          </div>

          <div className="mt-4">
            <InsumoNfPeriodoFiltro
              presetAtivo={presetAtivo}
              de={de}
              ate={ate}
              onPreset={handlePreset}
              onDe={(value) => {
                setPresetAtivo(null);
                setDe(value);
              }}
              onAte={(value) => {
                setPresetAtivo(null);
                setAte(value);
              }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-stone-500" role="status">
              Carregando notas…
            </p>
          ) : error ? (
            <EmptyState icon="error_outline" title={error} />
          ) : detalhes.length === 0 ? (
            <EmptyState
              icon="receipt_long"
              title="Nenhuma nota no período"
              description="Ajuste o filtro de datas ou amplie para 30 dias."
            />
          ) : (
            <>
              {resumo.truncado ? (
                <p className="mb-3 text-xs text-amber-800">
                  Mostrando as {INSUMO_NF_CONSULTA_LIMITE} notas mais recentes do período.
                </p>
              ) : null}
              <InsumoNfDetalheLista
                detalhes={detalhes}
                mostrarFornecedor={mostrarFornecedor}
              />
            </>
          )}
        </div>

        <div className="border-t border-stone-100 px-5 py-3">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
