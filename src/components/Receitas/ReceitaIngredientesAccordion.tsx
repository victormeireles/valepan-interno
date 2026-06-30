'use client';

import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';
import NumberDecimalInput from '@/components/FormControls/NumberDecimalInput';
import ReceitaColarPlanilhaStep from '@/components/Receitas/ReceitaColarPlanilhaStep';
import ReceitaImportMatchReview from '@/components/Receitas/ReceitaImportMatchReview';
import ReceitaIngredienteRow, {
  type ReceitaIngredienteFormItem,
} from '@/components/Receitas/ReceitaIngredienteRow';
import { formatarValorLateral } from '@/components/Receitas/receita-ingrediente-format';
import type {
  ReceitaImportLinhaRevisao,
  ReceitaPlanilhaLinhaParseada,
} from '@/domain/receitas/receita-planilha-types';
import type { ReceitaImportPhase } from '@/components/Receitas/useReceitaImportFlow';

type Props = {
  isEditing: boolean;
  accordionOpen: boolean;
  onAccordionToggle: () => void;
  ingredientes: ReceitaIngredienteFormItem[];
  importPhase: ReceitaImportPhase;
  importRows: ReceitaImportLinhaRevisao[];
  catalogoLoading: boolean;
  novoIngredienteId: string;
  novoIngredienteUnidade: string | null;
  novoIngredienteQuantidade: number;
  onNovoIngredienteIdChange: (value: string) => void;
  onNovoIngredienteNomeChange: (value: string) => void;
  onNovoIngredienteUnidadeChange: (value: string | null) => void;
  onNovoIngredienteQuantidadeChange: (value: number) => void;
  onAddIngrediente: () => void;
  onStartColarPlanilha: () => void;
  onPasteContinue: (linhas: ReceitaPlanilhaLinhaParseada[]) => void;
  onImportCancel: () => void;
  onImportRowsChange: (rows: ReceitaImportLinhaRevisao[]) => void;
  onImportConfirm: () => void;
  onImportBack: () => void;
  onQuantidadeChange: (tempId: string, quantidade: number) => void;
  onSwap: (
    tempId: string,
    swap: Pick<ReceitaIngredienteFormItem, 'insumoId' | 'insumoNome' | 'unidadeDescricao'>,
  ) => void;
  onRemove: (tempId: string) => void;
};

export default function ReceitaIngredientesAccordion({
  isEditing,
  accordionOpen,
  onAccordionToggle,
  ingredientes,
  importPhase,
  importRows,
  catalogoLoading,
  novoIngredienteId,
  novoIngredienteUnidade,
  novoIngredienteQuantidade,
  onNovoIngredienteIdChange,
  onNovoIngredienteNomeChange,
  onNovoIngredienteUnidadeChange,
  onNovoIngredienteQuantidadeChange,
  onAddIngrediente,
  onStartColarPlanilha,
  onPasteContinue,
  onImportCancel,
  onImportRowsChange,
  onImportConfirm,
  onImportBack,
  onQuantidadeChange,
  onSwap,
  onRemove,
}: Props) {
  return (
    <div className="border border-gray-100 rounded-2xl">
      <button
        type="button"
        onClick={onAccordionToggle}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-semibold text-gray-900">Ingredientes</p>
          <p className="text-xs text-gray-500">
            {ingredientes.length} ingrediente{ingredientes.length === 1 ? '' : 's'} adicionados
          </p>
        </div>
        <span className="material-icons text-gray-500">
          {accordionOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {accordionOpen && (
        <div className="px-6 pb-6 space-y-4">
          {importPhase === 'paste' ? (
            <ReceitaColarPlanilhaStep onContinue={onPasteContinue} onCancel={onImportCancel} />
          ) : importPhase === 'review' ? (
            <ReceitaImportMatchReview
              rows={importRows}
              usedInsumoIds={ingredientes.map((item) => item.insumoId)}
              onChange={onImportRowsChange}
              onConfirm={onImportConfirm}
              onBack={onImportBack}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                  <SelectRemoteAutocomplete
                    value={novoIngredienteId}
                    onChange={onNovoIngredienteIdChange}
                    stage="insumos"
                    placeholder="Selecione o insumo..."
                    label="Insumo"
                    required={false}
                    onOptionSelected={(option) => {
                      onNovoIngredienteNomeChange(option?.label ?? '');
                      const meta = option?.meta as Record<string, string> | undefined;
                      onNovoIngredienteUnidadeChange(meta?.unidade_nome_resumido ?? null);
                    }}
                  />
                  {novoIngredienteUnidade && (
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      Unidade:{' '}
                      <span className="font-semibold text-blue-600">{novoIngredienteUnidade}</span>
                    </p>
                  )}
                </div>
                <div className="relative">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <NumberDecimalInput
                        label={`Quantidade${novoIngredienteUnidade ? ` (${novoIngredienteUnidade})` : ''}`}
                        value={novoIngredienteQuantidade}
                        onChange={onNovoIngredienteQuantidadeChange}
                        min={0}
                        step={0.001}
                        placeholder="Ex: 2.500"
                      />
                    </div>
                    {(() => {
                      const valorFormatado = formatarValorLateral(
                        novoIngredienteQuantidade,
                        novoIngredienteUnidade,
                      );
                      return valorFormatado ? (
                        <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium whitespace-nowrap flex-shrink-0 mb-3">
                          {valorFormatado}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onAddIngrediente}
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors"
                >
                  <span className="material-icons text-sm mr-2">add</span>
                  Adicionar ingrediente
                </button>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={onStartColarPlanilha}
                    disabled={catalogoLoading}
                    className="inline-flex items-center px-4 py-2 rounded-xl border-2 border-stone-200 text-stone-800 text-sm font-semibold hover:bg-stone-50 transition-colors disabled:opacity-50"
                  >
                    <span className="material-icons text-sm mr-2">content_paste</span>
                    {catalogoLoading ? 'Carregando...' : 'Colar da planilha'}
                  </button>
                )}
              </div>

              {ingredientes.length > 0 && (
                <div className="space-y-3">
                  {ingredientes.map((item) => (
                    <ReceitaIngredienteRow
                      key={item.tempId}
                      item={item}
                      usedInsumoIds={ingredientes
                        .filter((entry) => entry.tempId !== item.tempId)
                        .map((entry) => entry.insumoId)}
                      onQuantidadeChange={onQuantidadeChange}
                      onSwap={onSwap}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
