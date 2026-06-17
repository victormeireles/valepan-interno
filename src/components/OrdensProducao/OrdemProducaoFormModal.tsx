'use client';

import DateInput from '@/components/FormControls/DateInput';
import NumberInput from '@/components/FormControls/NumberInput';
import AutocompleteInput from '@/components/FormControls/AutocompleteInput';
import TextInput from '@/components/FormControls/TextInput';
import type { OrdemProducaoPainelItem } from '@/domain/types/ordens-producao-painel';
import type { OrdemProducaoCreateBody } from '@/lib/managers/ordens-producao-list-manager';
import {
  ordensProducaoPreviewClass,
  ordensProducaoPrimaryButtonClass,
  ordensProducaoSecondaryButtonClass,
} from '@/components/OrdensProducao/ordens-producao-theme';
import {
  useOrdemProducaoForm,
  type OrdemProducaoFormMode,
} from '@/components/OrdensProducao/useOrdemProducaoForm';

type OrdemProducaoFormModalProps = {
  isOpen: boolean;
  mode: OrdemProducaoFormMode;
  filterDate: string;
  initialOrder?: OrdemProducaoPainelItem;
  onClose: () => void;
  onSave: (body: OrdemProducaoCreateBody, mode: OrdemProducaoFormMode, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

export default function OrdemProducaoFormModal({
  isOpen,
  mode,
  filterDate,
  initialOrder,
  onClose,
  onSave,
  onDelete,
}: OrdemProducaoFormModalProps) {
  const {
    form,
    setForm,
    tiposEstoqueOptions,
    produtosOptions,
    assadeiraState,
    previewLabel,
    loading,
    message,
    confirmDelete,
    handleProdutoChange,
    handleSubmit,
    handleDelete,
    resetForm,
  } = useOrdemProducaoForm({
    isOpen,
    mode,
    filterDate,
    initialOrder,
    onSave,
    onDelete,
  });

  if (!isOpen) return null;

  const title = mode === 'edit' ? 'Editar ordem' : 'Nova ordem';

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/50 p-0 sm:p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ordem-form-title"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-2xl sm:rounded-2xl border border-stone-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
          <div>
            <h2 id="ordem-form-title" className="text-lg font-semibold text-stone-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Campos equivalentes ao CSV de importação.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <span className="material-icons" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            {message ? (
              <div
                role="alert"
                className={`rounded-xl border px-4 py-3 text-sm ${
                  message.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {message.text}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DateInput
                label="Data de produção"
                value={form.dataProducao}
                onChange={(value) => setForm((prev) => ({ ...prev, dataProducao: value }))}
                required
              />
              <DateInput
                label="Data etiqueta"
                value={form.dataEtiqueta}
                onChange={(value) => setForm((prev) => ({ ...prev, dataEtiqueta: value }))}
                required
              />
            </div>

            <AutocompleteInput
              label="Tipo estoque"
              value={form.tipoEstoque}
              onChange={(value) => setForm((prev) => ({ ...prev, tipoEstoque: value }))}
              options={tiposEstoqueOptions}
              required
              strict
            />

            <AutocompleteInput
              label="Produto"
              value={form.produto}
              onChange={(value) => {
                void handleProdutoChange(value);
              }}
              onSelect={(value) => {
                void handleProdutoChange(value);
              }}
              options={produtosOptions}
              required
              strict
            />

            {assadeiraState.modo === 'latas' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberInput
                  label="Latas (LT)"
                  value={form.latas}
                  onChange={(value) => setForm((prev) => ({ ...prev, latas: value }))}
                  min={0}
                  step={1}
                />
                <div>
                  <label className="mb-3 block text-base font-semibold text-gray-800">
                    Assadeira <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.assadeiraId}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, assadeiraId: event.target.value }))
                    }
                    className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-4 text-base text-gray-900 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                    disabled={assadeiraState.loading || !form.produto}
                    required
                  >
                    <option value="">
                      {assadeiraState.loading ? 'Carregando...' : 'Selecione uma assadeira'}
                    </option>
                    {assadeiraState.options.map((assadeira) => (
                      <option key={assadeira.id} value={assadeira.id}>
                        {assadeira.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <NumberInput
                label="Unidades (UN)"
                value={form.unidades}
                onChange={(value) => setForm((prev) => ({ ...prev, unidades: value }))}
                min={0}
                step={1}
              />
            )}

            <TextInput
              label="Observação"
              value={form.observacao}
              onChange={(value) => setForm((prev) => ({ ...prev, observacao: value }))}
              placeholder="Opcional"
            />

            {previewLabel ? (
              <div className={ordensProducaoPreviewClass}>
                <span className="font-semibold">Preview:</span> {previewLabel}
              </div>
            ) : null}
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className={ordensProducaoSecondaryButtonClass}
              >
                Cancelar
              </button>
              {mode === 'edit' && onDelete ? (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={loading}
                  className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 font-semibold text-red-700 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                >
                  <span className="material-icons text-base" aria-hidden="true">
                    delete
                  </span>
                  {confirmDelete ? 'Confirmar exclusão' : 'Excluir ordem'}
                </button>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={ordensProducaoPrimaryButtonClass}
            >
              {loading ? 'Salvando…' : mode === 'edit' ? 'Salvar alterações' : 'Criar ordem'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
