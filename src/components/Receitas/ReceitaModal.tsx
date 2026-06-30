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
    helper: 'Ao salvar, atualiza automaticamente a quantidade de pães nos produtos vinculados.',
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
    helper: 'Cadastre quantidades por gramatura para pré-preencher ao vincular produtos.',
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
  const [codigo, setCodigo] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(true);
  const [ingredientes, setIngredientes] = useState<IngredienteForm[]>([]);
  const [gramaturas, setGramaturas] = useState<ReceitaGramaturaFormItem[]>([]);
  const [novoIngredienteNome, setNovoIngredienteNome] = useState('');
  const [novoIngredienteId, setNovoIngredienteId] = useState('');
  const [novoIngredienteUnidade, setNovoIngredienteUnidade] = useState<string | null>(null);
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
        setCodigo(receita.codigo);
        setAtivo(receita.ativo !== false);
        setIngredientes(
          (receita.receita_ingredientes || []).map((item) => ({
            tempId: item.id,
            id: item.id,
            insumoId: item.insumo_id || '',
            insumoNome: item.insumos?.nome ?? 'Ingrediente',
            unidadeDescricao:
              item.insumos?.unidades?.nome_resumido ?? item.insumos?.unidades?.nome ?? null,
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
        setCodigo(null);
        setAtivo(true);
        setIngredientes([]);
        setGramaturas([]);
      }
      setNovoIngredienteId('');
      setNovoIngredienteNome('');
      setNovoIngredienteUnidade(null);
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
        quantidade: novoIngredienteQuantidade,
      },
    ]);

    setNovoIngredienteId('');
    setNovoIngredienteNome('');
    setNovoIngredienteUnidade(null);
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
    swap: Pick<IngredienteForm, 'insumoId' | 'insumoNome' | 'unidadeDescricao'>,
  ) => {
    setIngredientes((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? {
              ...item,
              insumoId: swap.insumoId,
              insumoNome: swap.insumoNome,
              unidadeDescricao: swap.unidadeDescricao,
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
        codigo,
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

            <TextInput
              label="Código"
              value={codigo ?? ''}
              onChange={(value) => setCodigo(value || null)}
              placeholder="Opcional"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="w-full">
              <label className="block text-base font-semibold text-gray-800 mb-3">
                Tipo de receita <span className="text-red-500">*</span>
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoReceita)}
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-medium bg-white text-gray-900"
                required
              >
                {tipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">{tipoHelper}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">Status</label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                {ativo ? 'Ativa' : 'Inativa'}
              </label>
            </div>
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

