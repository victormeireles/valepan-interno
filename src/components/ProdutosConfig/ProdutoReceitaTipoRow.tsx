'use client';

import type { TipoReceita } from '@/components/ProdutosConfig/produto-receita-tipo-options';
import type { ReceitaCatalogoItem } from '@/components/ProdutosConfig/ProdutoReceitasConfigModal';

type TipoOption = {
  value: TipoReceita;
  label: string;
  helper: string;
  icon: string;
};

type CalculoAutomaticoProps = {
  resumo: string | null;
  aviso: string | null;
  sugestao: number | null;
  manual: boolean;
  onRecalcular: () => void;
};

type Props = {
  option: TipoOption;
  vinculoAtivo: boolean;
  receitasDisponiveis: ReceitaCatalogoItem[];
  receitaId: string;
  quantidade: number | undefined;
  isSaving: boolean;
  isDisabled: boolean;
  calculoAutomatico?: CalculoAutomaticoProps;
  onReceitaChange: (value: string) => void;
  onQuantidadeChange: (value: number | undefined) => void;
  onSave: () => void;
  onUnlink: () => void;
};

const saveButtonClassName =
  'min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

const fieldClassName =
  'w-full min-h-11 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50';

const rowGridClassName =
  'lg:grid lg:grid-cols-[7.5rem_minmax(0,1fr)_5.5rem_6.5rem] lg:items-center lg:gap-3';

export default function ProdutoReceitaTipoRow({
  option,
  vinculoAtivo,
  receitasDisponiveis,
  receitaId,
  quantidade,
  isSaving,
  isDisabled,
  calculoAutomatico,
  onReceitaChange,
  onQuantidadeChange,
  onSave,
  onUnlink,
}: Props) {
  const receitaFieldId = `receita-${option.value}`;
  const quantidadeFieldId = `quantidade-${option.value}`;

  return (
    <div className="border-b border-gray-100 last:border-b-0 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className={`flex flex-col gap-2 ${rowGridClassName}`}>
        <div className="flex items-center gap-2 min-w-0 lg:self-center">
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100 text-gray-600"
            title={option.helper}
            aria-hidden="true"
          >
            <span className="material-icons text-base">{option.icon}</span>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900" title={option.helper}>
              {option.label}
            </p>
            {vinculoAtivo && (
              <p className="text-[11px] text-emerald-600">Vinculado</p>
            )}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 lg:contents">
          <div className="min-w-0 flex-1 lg:col-start-2">
            <label htmlFor={receitaFieldId} className="sr-only">
              Receita de {option.label}
            </label>
            <select
              id={receitaFieldId}
              value={receitaId}
              onChange={(e) => onReceitaChange(e.target.value)}
              disabled={isDisabled}
              title={option.helper}
              className={fieldClassName}
            >
              <option value="">Selecione...</option>
              {receitasDisponiveis.map((receita) => (
                <option key={receita.id} value={receita.id}>
                  {receita.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[5.5rem] shrink-0 lg:w-full lg:col-start-3">
            <label htmlFor={quantidadeFieldId} className="sr-only">
              Quantidade de {option.label}
            </label>
            <input
              id={quantidadeFieldId}
              type="number"
              step="0.001"
              min="0"
              value={quantidade ?? ''}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                onQuantidadeChange(Number.isNaN(parsed) ? undefined : parsed);
              }}
              disabled={isDisabled}
              className={`${fieldClassName} tabular-nums`}
              placeholder="Qtd"
              aria-label={`Quantidade de ${option.label}`}
            />
          </div>

          <div className="flex items-center justify-end gap-1.5 shrink-0 lg:col-start-4">
            <button
              type="button"
              onClick={onSave}
              disabled={isDisabled}
              className={saveButtonClassName}
              aria-label={isSaving ? `Salvando ${option.label}` : `Salvar ${option.label}`}
            >
              {isSaving ? (
                <span
                  className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <span className="material-icons text-base" aria-hidden="true">
                  save
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onUnlink}
              disabled={isDisabled || !vinculoAtivo}
              className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-rose-700 border border-rose-200 bg-white hover:bg-rose-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 ${
                vinculoAtivo ? '' : 'invisible pointer-events-none'
              }`}
              aria-label={`Remover vínculo de ${option.label}`}
              aria-hidden={!vinculoAtivo}
              tabIndex={vinculoAtivo ? 0 : -1}
            >
              <span className="material-icons text-base" aria-hidden="true">
                delete_outline
              </span>
            </button>
          </div>
        </div>

        {calculoAutomatico && receitaId ? (
          <div className="lg:col-span-3 lg:col-start-2 space-y-1">
            {calculoAutomatico.resumo ? (
              <p className="text-xs text-stone-600">
                <span className="font-medium text-amber-800">Sugestão:</span>{' '}
                <span className="font-mono tabular-nums">{calculoAutomatico.resumo}</span>
              </p>
            ) : null}
            {calculoAutomatico.aviso ? (
              <p className="text-xs text-amber-700">{calculoAutomatico.aviso}</p>
            ) : null}
            {calculoAutomatico.manual && calculoAutomatico.sugestao != null ? (
              <button
                type="button"
                onClick={calculoAutomatico.onRecalcular}
                disabled={isDisabled}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-50"
              >
                Recalcular ({calculoAutomatico.sugestao.toLocaleString('pt-BR')})
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
