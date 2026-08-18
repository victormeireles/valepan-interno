'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import type {
  InsumoMovimentoRecord,
  InsumoSaldoComDetalhes,
} from '@/domain/types/insumo-estoque';
import { InsumoHistoricoAgrupador } from '@/domain/insumos/insumo-historico-agrupador';
import {
  getInsumoHistoricoPresetRange,
  INSUMO_HISTORICO_LIMITE,
  type InsumoHistoricoPreset,
} from '@/domain/insumos/insumo-historico-periodo';
import { getInsumoMovimentos } from '@/app/actions/insumo-estoque-actions';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import InsumoHistoricoLista from './InsumoHistoricoLista';
import InsumoHistoricoPeriodoFiltro from './InsumoHistoricoPeriodoFiltro';

type Props = {
  isOpen: boolean;
  item: InsumoSaldoComDetalhes | null;
  onClose: () => void;
};

const agrupador = new InsumoHistoricoAgrupador();

export default function InsumoHistoricoModal({ isOpen, item, onClose }: Props) {
  const titleId = useId();
  const [presetAtivo, setPresetAtivo] = useState<InsumoHistoricoPreset | null>('hoje');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [movimentos, setMovimentos] = useState<InsumoMovimentoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      const range = getInsumoHistoricoPresetRange('hoje');
      setAnimating(true);
      setPresetAtivo('hoje');
      setDe(range.de);
      setAte(range.ate);
      setMovimentos([]);
      setError('');
    } else if (!isOpen) {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen || !item || !de || !ate) return;
    setLoading(true);
    setError('');
    getInsumoMovimentos(item.insumoId, { de, ate })
      .then(setMovimentos)
      .catch(() => setError('Erro ao carregar histórico'))
      .finally(() => setLoading(false));
  }, [isOpen, item, de, ate]);

  const itens = useMemo(() => agrupador.agrupar(movimentos), [movimentos]);
  const truncado = movimentos.length >= INSUMO_HISTORICO_LIMITE;

  if ((!isOpen && !animating) || !item) return null;

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
        className={`relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg transition-all duration-300 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
        }`}
      >
        <div className="shrink-0 border-b border-stone-100 px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 id={titleId} className="text-xl font-bold tracking-tight text-stone-900">
                Histórico de movimentos
              </h2>
              <p className="mt-1 text-sm text-stone-600">{item.nome}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="Fechar"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
          <div className="mt-4">
            <InsumoHistoricoPeriodoFiltro
              presetAtivo={presetAtivo}
              de={de}
              ate={ate}
              onPreset={(preset) => {
                const range = getInsumoHistoricoPresetRange(preset);
                setPresetAtivo(preset);
                setDe(range.de);
                setAte(range.ate);
              }}
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

        <div className="flex-1 overflow-y-auto p-6">
          {truncado ? (
            <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-100">
              Mostrando os 500 movimentos mais recentes — refine o período se precisar de mais detalhe.
            </div>
          ) : null}
          {loading ? (
            <p className="text-sm text-stone-500">Carregando movimentos…</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : itens.length === 0 ? (
            <EmptyState
              icon="history"
              title="Nenhum movimento neste período"
              description="Tente ampliar o intervalo com os atalhos ou as datas acima."
            />
          ) : (
            <InsumoHistoricoLista
              itens={itens}
              unidadeResumida={item.unidadeResumida}
              mostrarCabecalhoDia={de !== ate}
            />
          )}
        </div>

        <div className="border-t border-stone-100 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
