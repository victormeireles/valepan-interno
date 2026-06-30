'use client';

import { useState } from 'react';
import { createInsumo } from '@/app/actions/insumos-actions';
import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';
import { Button } from '@/components/ui/Button';
import type { InsumoSelecionadoResumo } from '@/features/insumo-estoque/utils/insumo-conversao-ui';

type UnidadeOptionMeta = {
  unidadeNomeResumido?: string;
  unidadeCodigo?: string;
  codigo?: string;
};

type Props = {
  nomeInicial: string;
  onCreated: (insumo: InsumoSelecionadoResumo) => void;
  onCancel: () => void;
};

export default function InsumoCriarInlinePanel({ nomeInicial, onCreated, onCancel }: Props) {
  const [nome, setNome] = useState(nomeInicial);
  const [unidadeId, setUnidadeId] = useState('');
  const [unidadeMeta, setUnidadeMeta] = useState<UnidadeOptionMeta>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnidadeSelected = (
    option: { label: string; value: string; meta?: Record<string, unknown> } | null,
  ) => {
    if (!option) {
      setUnidadeMeta({});
      return;
    }
    const meta = (option.meta ?? {}) as UnidadeOptionMeta;
    setUnidadeMeta({
      unidadeCodigo: meta.unidadeCodigo ?? meta.codigo ?? option.label,
      unidadeNomeResumido: meta.unidadeNomeResumido ?? option.label,
    });
  };

  const handleSubmit = async () => {
    if (!nome.trim() || !unidadeId) return;

    setLoading(true);
    setError('');

    const result = await createInsumo({
      nome: nome.trim(),
      custo_unitario: 0,
      unidade_id: unidadeId,
      ativo: true,
    });

    if (!result.success || !result.data) {
      setError(result.error ?? 'Erro ao criar insumo');
      setLoading(false);
      return;
    }

    onCreated({
      id: result.data.id,
      nome: result.data.nome,
      unidadeCodigo: unidadeMeta.unidadeCodigo ?? '',
      unidadeNome: unidadeMeta.unidadeNomeResumido ?? '',
    });
    setLoading(false);
  };

  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-900">Novo insumo</p>
          <p className="mt-0.5 text-xs text-stone-600">
            Cadastro rápido para continuar o vínculo. O custo será atualizado pela entrada.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-medium text-stone-600 hover:bg-white/80 hover:text-stone-900"
        >
          <span className="material-icons text-base" aria-hidden="true">
            arrow_back
          </span>
          Voltar
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
        >
          <span className="material-icons text-base" aria-hidden="true">
            error
          </span>
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label htmlFor="insumo-criar-nome" className="mb-1.5 ml-1 block text-sm font-medium text-stone-700">
            Nome <span className="text-rose-500">*</span>
          </label>
          <input
            id="insumo-criar-nome"
            type="text"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            disabled={loading}
            placeholder="Ex: Fermento químico"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <SelectRemoteAutocomplete
          value={unidadeId}
          onChange={setUnidadeId}
          onOptionSelected={handleUnidadeSelected}
          stage="unidades"
          label="Unidade no estoque"
          placeholder="Buscar unidade..."
          extraFields={['codigo']}
          disabled={loading}
        />

        <Button
          type="button"
          fullWidth
          disabled={loading || !nome.trim() || !unidadeId}
          onClick={() => void handleSubmit()}
        >
          {loading ? 'Criando…' : 'Criar e selecionar'}
        </Button>
      </div>
    </div>
  );
}
