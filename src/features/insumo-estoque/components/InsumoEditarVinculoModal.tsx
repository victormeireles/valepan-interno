'use client';

import { useEffect, useId, useState } from 'react';
import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';
import { atualizarIntegracaoInsumoVinculo } from '@/app/actions/insumo-estoque-actions';
import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';
import { Button } from '@/components/ui/Button';
import InsumoResolverConversaoSection from '@/features/insumo-estoque/components/InsumoResolverConversaoSection';
import {
  formatUnidadeLabel,
  type InsumoSelecionadoResumo,
} from '@/features/insumo-estoque/utils/insumo-conversao-ui';

type Props = {
  isOpen: boolean;
  vinculo: IntegracaoInsumoListItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
};

type InsumoOptionMeta = {
  unidadeNomeResumido?: string;
  unidadeCodigo?: string;
};

export default function InsumoEditarVinculoModal({
  isOpen,
  vinculo,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId();
  const [insumoId, setInsumoId] = useState('');
  const [insumoSelecionado, setInsumoSelecionado] = useState<InsumoSelecionadoResumo | null>(null);
  const [fatorConversao, setFatorConversao] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen && vinculo) {
      setAnimating(true);
      setInsumoId(vinculo.insumo_id);
      setInsumoSelecionado({
        id: vinculo.insumo_id,
        nome: vinculo.insumoNome,
        unidadeCodigo: vinculo.insumoUnidadeCodigo ?? '',
        unidadeNome: vinculo.insumoUnidadeNome ?? '',
      });
      setFatorConversao(String(vinculo.fator_conversao));
      setError('');
    } else if (!isOpen) {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, vinculo]);

  if ((!isOpen && !animating) || !vinculo) return null;

  const handleInsumoSelected = (
    option: { label: string; value: string; meta?: Record<string, unknown> } | null,
  ) => {
    if (!option) {
      setInsumoSelecionado(null);
      return;
    }

    const meta = (option.meta ?? {}) as InsumoOptionMeta;
    setInsumoSelecionado({
      id: option.value,
      nome: option.label,
      unidadeCodigo: meta.unidadeCodigo ?? meta.unidadeNomeResumido ?? '',
      unidadeNome: meta.unidadeNomeResumido ?? meta.unidadeCodigo ?? '',
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const fator = Number(fatorConversao.replace(',', '.'));
    const result = await atualizarIntegracaoInsumoVinculo(vinculo.id, insumoId, fator);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onSaved('Vínculo atualizado');
    onClose();
    setLoading(false);
  };

  const unidadeInsumoLabel = insumoSelecionado
    ? formatUnidadeLabel(insumoSelecionado.unidadeCodigo, insumoSelecionado.unidadeNome)
    : null;

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
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg transition-all duration-300 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
        }`}
      >
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 id={titleId} className="text-xl font-bold tracking-tight text-stone-900">
              Editar vínculo
            </h2>
            <p className="mt-1 text-sm text-stone-600">{vinculo.empresaNome}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Fechar"
          >
            <span className="material-icons" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {error ? (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                <span className="material-icons text-base" aria-hidden="true">
                  error
                </span>
                {error}
              </div>
            ) : null}

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Produto Omie
              </p>
              <p className="mt-2 font-mono text-xs text-stone-500">
                {vinculo.omie_codigo_produto || vinculo.omie_id_produto}
              </p>
              <p className="mt-1 font-medium text-stone-900">
                {vinculo.descricao_omie || 'Produto sem descrição'}
              </p>
            </div>

            <p className="text-xs text-stone-500">
              Alteração vale para próximos recebimentos. Entradas já registradas não mudam.
            </p>

            <SelectRemoteAutocomplete
              value={insumoId}
              onChange={setInsumoId}
              onOptionSelected={handleInsumoSelected}
              stage="insumos"
              label="Insumo no estoque"
              placeholder="Buscar insumo..."
              required
            />

            <InsumoResolverConversaoSection
              unidadeNf={null}
              descricaoOmie={vinculo.descricao_omie ?? ''}
              insumo={insumoSelecionado}
              fatorConversao={fatorConversao}
              onFatorChange={setFatorConversao}
              preview={null}
              previewLabel="Conversão"
            />

            {unidadeInsumoLabel ? (
              <p className="text-xs text-stone-500">
                Unidade do insumo: <span className="font-mono">{unidadeInsumoLabel}</span>
              </p>
            ) : null}
          </div>

          <div className="flex gap-3 border-t border-stone-100 px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !insumoId}>
              {loading ? 'Salvando…' : 'Salvar vínculo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
