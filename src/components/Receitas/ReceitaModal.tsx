'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  ReceitaWithRelations,
  ReceitaSaveResult,
  ReceitaInput,
} from '@/app/actions/receitas-actions';
import { createReceita, updateReceita } from '@/app/actions/receitas-actions';
import type { ReceitaGramaturaVinculoSyncResult } from '@/domain/receitas/receita-gramatura-vinculos-sync-manager';
import type { ReceitaMassaVinculoSyncResult } from '@/domain/receitas/receita-massa-vinculos-sync-manager';
import TextInput from '@/components/FormControls/TextInput';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { type ReceitaIngredienteFormItem } from '@/components/Receitas/ReceitaIngredienteRow';
import { useReceitaImportFlow } from '@/components/Receitas/useReceitaImportFlow';
import ReceitaIngredientesAccordion from '@/components/Receitas/ReceitaIngredientesAccordion';
import ReceitaGramaturasSection, {
  type ReceitaGramaturaFormItem,
} from '@/components/Receitas/ReceitaGramaturasSection';
import { receitaTipoUsaGramatura } from '@/domain/receitas/receita-gramatura-resolver';

type TipoReceita = ReceitaWithRelations['tipo'];

interface ReceitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (info?: {
    vinculosMassa?: ReceitaMassaVinculoSyncResult;
    vinculosGramatura?: ReceitaGramaturaVinculoSyncResult;
  }) => void;
  receita?: ReceitaWithRelations | null;
}

type IngredienteForm = ReceitaIngredienteFormItem;

const tipoOptions: Array<{ value: TipoReceita; label: string; helper: string }> = [
  {
    value: 'massa',
    label: 'Massa',
    helper:
      'Cadastre a massa crua (g) por gramatura assada. Ao salvar, recalcula a quantidade de pães dos produtos vinculados.',
  },
  {
    value: 'brilho',
    label: 'Brilho',
    helper:
      'Cadastre quantos pães de cada gramatura 1 L cobre. Ao vincular, calcula volume da receita × esse valor.',
  },
  {
    value: 'confeito',
    label: 'Confeito',
    helper:
      'Cadastre quantos pães de cada gramatura 1 kg cobre. Ao vincular, calcula peso da receita × esse valor.',
  },
  {
    value: 'antimofo',
    label: 'Antimofo',
    helper: 'Cadastre quantidades por gramatura para pré-preencher ao vincular produtos.',
  },
  {
    value: 'embalagem',
    label: 'Embalagem',
    helper: 'Cadastre quantidades por gramatura (pães por pacote, etc.).',
  },
  {
    value: 'caixa',
    label: 'Caixa',
    helper: 'Cadastre quantidades por gramatura (pacotes por caixa, etc.).',
  },
];

const generateTempId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export default function ReceitaModal({ isOpen, onClose, onSaved, receita }: ReceitaModalProps) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoReceita>('massa');
  const [ativo, setAtivo] = useState(true);
  const [ingredientes, setIngredientes] = useState<IngredienteForm[]>([]);
  const [gramaturas, setGramaturas] = useState<ReceitaGramaturaFormItem[]>([]);
  const [novoIngredienteNome, setNovoIngredienteNome] = useState('');
  const [novoIngredienteId, setNovoIngredienteId] = useState('');
  const [novoIngredienteUnidade, setNovoIngredienteUnidade] = useState<string | null>(null);
  const [novoIngredienteCustoUnitario, setNovoIngredienteCustoUnitario] = useState<number | null>(null);
  const [novoIngredienteQuantidade, setNovoIngredienteQuantidade] = useState(0);
  const [accordionOpen, setAccordionOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    importPhase,
    importRows,
    catalogoLoading,
    setImportPhase,
    setImportRows,
    resetImport,
    handleStartColarPlanilha,
    handlePasteContinue,
    handleImportConfirm,
  } = useReceitaImportFlow({
    ingredientes,
    generateTempId,
    onIngredientesChange: setIngredientes,
    onError: setError,
    onClearError: () => setError(null),
    onAccordionOpen: () => setAccordionOpen(true),
  });

  useEffect(() => {
    if (isOpen) {
      if (receita) {
        setNome(receita.nome);
        setTipo(receita.tipo);
        setAtivo(receita.ativo !== false);
        setIngredientes(
          (receita.receita_ingredientes || []).map((item) => ({
            tempId: item.id,
            id: item.id,
            insumoId: item.insumo_id || '',
            insumoNome: item.insumos?.nome ?? 'Ingrediente',
            unidadeDescricao:
              item.insumos?.unidades?.nome_resumido ?? item.insumos?.unidades?.nome ?? null,
            custoUnitario: item.insumos?.custo_unitario ?? null,
            quantidade: item.quantidade_padrao,
          })),
        );
        setGramaturas(
          (receita.receita_gramaturas || []).map((item) => ({
            tempId: item.id,
            id: item.id,
            pesoG: item.peso_g,
            quantidade: Number(item.quantidade_padrao),
          })),
        );
      } else {
        setNome('');
        setTipo('massa');
        setAtivo(true);
        setIngredientes([]);
        setGramaturas([]);
      }
      setNovoIngredienteId('');
      setNovoIngredienteNome('');
      setNovoIngredienteUnidade(null);
      setNovoIngredienteCustoUnitario(null);
      setNovoIngredienteQuantidade(0);
      setError(null);
      resetImport();
    }
  }, [isOpen, receita, resetImport]);

  const tipoHelper = useMemo(
    () => tipoOptions.find((option) => option.value === tipo)?.helper ?? '',
    [tipo],
  );

  if (!isOpen) return null;

  const handleAddIngrediente = () => {
    if (!novoIngredienteId) {
      setError('Selecione um insumo para adicionar.');
      return;
    }
    if (novoIngredienteQuantidade <= 0) {
      setError('Informe uma quantidade válida para o ingrediente.');
      return;
    }
    const alreadyExists = ingredientes.some((item) => item.insumoId === novoIngredienteId);
    if (alreadyExists) {
      setError('Este insumo já está na lista.');
      return;
    }

    setIngredientes((prev) => [
      ...prev,
      {
        tempId: generateTempId(),
        insumoId: novoIngredienteId,
        insumoNome: novoIngredienteNome || 'Ingrediente',
        unidadeDescricao: novoIngredienteUnidade,
        custoUnitario: novoIngredienteCustoUnitario,
        quantidade: novoIngredienteQuantidade,
      },
    ]);

    setNovoIngredienteId('');
    setNovoIngredienteNome('');
    setNovoIngredienteUnidade(null);
    setNovoIngredienteCustoUnitario(null);
    setNovoIngredienteQuantidade(0);
    setError(null);
  };

  const handleRemoveIngrediente = (tempId: string) => {
    setIngredientes((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleQuantidadeChange = (tempId: string, quantidade: number) => {
    setIngredientes((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, quantidade } : item)),
    );
  };

  const handleSwapIngrediente = (
    tempId: string,
    swap: Pick<IngredienteForm, 'insumoId' | 'insumoNome' | 'unidadeDescricao' | 'custoUnitario'>,
  ) => {
    setIngredientes((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? {
              ...item,
              insumoId: swap.insumoId,
              insumoNome: swap.insumoNome,
              unidadeDescricao: swap.unidadeDescricao,
              custoUnitario: swap.custoUnitario,
            }
          : item,
      ),
    );
    setError(null);
  };

  const tipoUsaGramatura = receitaTipoUsaGramatura(tipo);

  const gramaturasValidas = gramaturas.filter(
    (item) => item.pesoG >= 1 && item.quantidade > 0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: ReceitaInput = {
        nome,
        tipo,
        ativo,
        ingredientes: ingredientes.map((item) => ({
          id: item.id,
          insumoId: item.insumoId,
          quantidade: item.quantidade,
        })),
        ...(tipoUsaGramatura
          ? {
              gramaturas: gramaturasValidas.map((item) => ({
                id: item.id,
                pesoG: item.pesoG,
                quantidade: item.quantidade,
              })),
            }
          : {}),
      };

      const result: ReceitaSaveResult = receita
        ? await updateReceita({ id: receita.id, ...payload })
        : await createReceita(payload);

      if (!result.success) {
        throw new Error(result.error as string);
      }

      onSaved?.(
        result.success
          ? { vinculosMassa: result.vinculosMassa, vinculosGramatura: result.vinculosGramatura }
          : undefined,
      );
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar receita';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {receita ? 'Editar Receita' : 'Nova Receita'}
            </h2>
            <p className="text-sm text-gray-500">
              {receita ? 'Atualize os dados da receita.' : 'Preencha os dados para cadastrar.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2">
              <span className="material-icons text-sm">error</span>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextInput
              label="Nome"
              value={nome}
              onChange={setNome}
              placeholder="Ex: Massa Brioche"
              required
            />

            <Select
              label="Tipo de receita"
              required
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoReceita)}
              hint={tipoHelper}
            >
              {tipoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <ReceitaIngredientesAccordion
            isEditing={Boolean(receita)}
            accordionOpen={accordionOpen}
            onAccordionToggle={() => setAccordionOpen((prev) => !prev)}
            ingredientes={ingredientes}
            importPhase={importPhase}
            importRows={importRows}
            catalogoLoading={catalogoLoading}
            novoIngredienteId={novoIngredienteId}
            novoIngredienteUnidade={novoIngredienteUnidade}
            novoIngredienteQuantidade={novoIngredienteQuantidade}
            onNovoIngredienteIdChange={setNovoIngredienteId}
            onNovoIngredienteNomeChange={setNovoIngredienteNome}
            onNovoIngredienteUnidadeChange={setNovoIngredienteUnidade}
            onNovoIngredienteCustoUnitarioChange={setNovoIngredienteCustoUnitario}
            onNovoIngredienteQuantidadeChange={setNovoIngredienteQuantidade}
            onAddIngrediente={handleAddIngrediente}
            onStartColarPlanilha={handleStartColarPlanilha}
            onPasteContinue={handlePasteContinue}
            onImportCancel={() => setImportPhase('idle')}
            onImportRowsChange={setImportRows}
            onImportConfirm={handleImportConfirm}
            onImportBack={() => setImportPhase('paste')}
            onQuantidadeChange={handleQuantidadeChange}
            onSwap={handleSwapIngrediente}
            onRemove={handleRemoveIngrediente}
          />

          {tipoUsaGramatura && (
            <ReceitaGramaturasSection tipo={tipo} gramaturas={gramaturas} onChange={setGramaturas} />
          )}

          <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
            <Switch
              checked={ativo}
              onChange={setAtivo}
              label={ativo ? 'Ativa' : 'Inativa'}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 text-gray-700 bg-white border-2 border-gray-100 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-200 transition-all disabled:opacity-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] px-6 py-3.5 text-white bg-gray-900 rounded-xl font-semibold shadow-lg shadow-gray-900/20 hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <span>{receita ? 'Salvar alterações' : 'Criar receita'}</span>
                  <span className="material-icons text-sm">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

