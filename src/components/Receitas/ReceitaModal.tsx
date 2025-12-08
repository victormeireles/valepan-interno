'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReceitaWithRelations, ReceitaInput } from '@/app/actions/receitas-actions';
import { createReceita, updateReceita } from '@/app/actions/receitas-actions';
import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';
import TextInput from '@/components/FormControls/TextInput';
import NumberDecimalInput from '@/components/FormControls/NumberDecimalInput';

type TipoReceita = ReceitaWithRelations['tipo'];

interface ReceitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  receita?: ReceitaWithRelations | null;
}

type IngredienteForm = {
  tempId: string;
  id?: string;
  insumoId: string;
  insumoNome: string;
  unidadeDescricao?: string | null;
  quantidade: number;
};

const tipoOptions: Array<{ value: TipoReceita; label: string; helper: string }> = [
  {
    value: 'massa',
    label: 'Massa',
    helper: 'Quantidade de produtos que 1 receita de massa atende.',
  },
  {
    value: 'brilho',
    label: 'Brilho',
    helper: 'Quantidade representa quantos produtos uma receita de brilho cobre.',
  },
  {
    value: 'confeito',
    label: 'Confeito',
    helper: 'Quantidade representa quantos produtos uma receita de confeito atende.',
  },
  {
    value: 'antimofo',
    label: 'Antimofo',
    helper: 'Quantidade representa quantos produtos uma receita de antimofo atende.',
  },
  {
    value: 'embalagem',
    label: 'Embalagem',
    helper: 'Quantidade representa quantos pães vão em um pacote.',
  },
  {
    value: 'caixa',
    label: 'Caixa',
    helper: 'Quantidade representa quantos pacotes (ou pães) vão em uma caixa.',
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
  const [novoIngredienteNome, setNovoIngredienteNome] = useState('');
  const [novoIngredienteId, setNovoIngredienteId] = useState('');
  const [novoIngredienteUnidade, setNovoIngredienteUnidade] = useState<string | null>(null);
  const [novoIngredienteQuantidade, setNovoIngredienteQuantidade] = useState(0);
  const [accordionOpen, setAccordionOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      } else {
        setNome('');
        setTipo('massa');
        setCodigo(null);
        setAtivo(true);
        setIngredientes([]);
      }
      setNovoIngredienteId('');
      setNovoIngredienteNome('');
      setNovoIngredienteUnidade(null);
      setNovoIngredienteQuantidade(0);
      setError(null);
    }
  }, [isOpen, receita]);

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

  // Função para formatar valor para exibição ao lado do input
  const formatarValorLateral = (valor: number, unidade: string | null | undefined): string | null => {
    if (!unidade || valor <= 0) return null;
    
    const unidadeLower = unidade.toLowerCase().trim();
    const isKg = unidadeLower === 'kg' || unidadeLower === 'kilograma' || unidadeLower === 'kilogramas';
    
    // Se for kg e valor < 1, mostrar em gramas
    if (isKg && valor < 1) {
      return `${Math.round(valor * 1000)}g`;
    }
    
    // Caso contrário, formatar com a unidade
    const unidadeFormatada = unidade.replace(/\s+/g, '');
    return `${valor}${unidadeFormatada}`;
  };

  // Função para calcular gramas (usado no padrão)
  const calcularGramas = (valor: number, unidade: string | null | undefined): number | null => {
    if (!unidade) return null;
    const unidadeLower = unidade.toLowerCase().trim();
    if ((unidadeLower === 'kg' || unidadeLower === 'kilograma' || unidadeLower === 'kilogramas') && valor > 0 && valor < 1) {
      return Math.round(valor * 1000);
    }
    return null;
  };

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
      };

      const result = receita
        ? await updateReceita({ id: receita.id, ...payload })
        : await createReceita(payload);

      if (!result.success) {
        throw new Error(result.error as string);
      }

      onSaved?.();
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

          <div className="border border-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setAccordionOpen((prev) => !prev)}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="w-full">
                    <SelectRemoteAutocomplete
                      value={novoIngredienteId}
                      onChange={(value) => setNovoIngredienteId(value)}
                      stage="insumos"
                      placeholder="Selecione o insumo..."
                      label="Insumo"
                      required={false}
                      onOptionSelected={(option) => {
                        setNovoIngredienteNome(option?.label ?? '');
                        const meta = option?.meta as Record<string, string> | undefined;
                        setNovoIngredienteUnidade(meta?.unidade_nome_resumido ?? null);
                      }}
                    />
                    {novoIngredienteUnidade && (
                      <p className="text-xs text-gray-500 mt-2 ml-1">
                        Unidade: <span className="font-semibold text-blue-600">{novoIngredienteUnidade}</span>
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <NumberDecimalInput
                          label={`Quantidade${novoIngredienteUnidade ? ` (${novoIngredienteUnidade})` : ''}`}
                          value={novoIngredienteQuantidade}
                          onChange={setNovoIngredienteQuantidade}
                          min={0}
                          step={0.001}
                          placeholder="Ex: 2.500"
                        />
                      </div>
                      {(() => {
                        const valorFormatado = formatarValorLateral(novoIngredienteQuantidade, novoIngredienteUnidade);
                        return valorFormatado ? (
                          <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium whitespace-nowrap flex-shrink-0 mb-3">
                            {valorFormatado}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddIngrediente}
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors"
                >
                  <span className="material-icons text-sm mr-2">add</span>
                  Adicionar ingrediente
                </button>

                {ingredientes.length > 0 && (
                  <div className="space-y-3">
                    {ingredientes.map((item) => (
                      <div
                        key={item.tempId}
                        className="flex flex-col md:flex-row md:items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4"
                      >
                        <div className="flex-1">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">{item.insumoNome}</p>
                              {item.unidadeDescricao && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                  {item.unidadeDescricao}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              Padrão:{' '}
                              {(() => {
                                const gramas = calcularGramas(item.quantidade, item.unidadeDescricao);
                                if (gramas !== null) {
                                  return (
                                    <>
                                      {item.quantidade}{item.unidadeDescricao} / <span className="text-blue-600 font-medium">{gramas}g</span>
                                    </>
                                  );
                                }
                                return `${item.quantidade} ${item.unidadeDescricao || ''}`;
                              })()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-28">
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={item.quantidade}
                              onChange={(e) =>
                                handleQuantidadeChange(item.tempId, parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                            />
                          </div>
                          {(() => {
                            const valorFormatado = formatarValorLateral(item.quantidade, item.unidadeDescricao);
                            return valorFormatado ? (
                              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium whitespace-nowrap flex-shrink-0">
                                {valorFormatado}
                              </span>
                            ) : null;
                          })()}
                          <button
                            type="button"
                            onClick={() => handleRemoveIngrediente(item.tempId)}
                            className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                          >
                            <span className="material-icons text-base">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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

