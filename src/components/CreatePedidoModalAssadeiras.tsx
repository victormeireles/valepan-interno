'use client';

import { useEffect, useState } from 'react';
import DateInput from '@/components/FormControls/DateInput';
import NumberInput from '@/components/FormControls/NumberInput';
import AutocompleteInput from '@/components/FormControls/AutocompleteInput';
import TextInput from '@/components/FormControls/TextInput';
import Switch from '@/components/FormControls/Switch';
import { deriveQuantidadesFromAssadeiras } from '@/domain/producao/ordem-derivados';

type PedidoItem = {
  produto: string;
  congelado: boolean;
  assadeiras: number;
  assadeiraId: string;
  tipoCliente?: string | null;
  observacao?: string;
};

type CreatePedidoData = {
  dataPedido: string;
  dataFabricacao: string;
  cliente: string;
  observacao: string;
  itens: PedidoItem[];
};

type CreatePedidoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePedidoData) => Promise<void>;
  clientesOptions: string[];
  produtosOptions: string[];
  loading?: boolean;
  visibleFields?: {
    dataFabricacao?: boolean;
    cliente?: boolean;
    observacao?: boolean;
    congelado?: boolean;
    pacotes?: boolean;
  };
  labelsOverride?: {
    title?: string;
    caixas?: string;
    pacotes?: string;
    unidades?: string;
    kg?: string;
  };
};

type AssadeiraOption = {
  id: string;
  nome: string;
  unidadesPorAssadeiraEfetiva: number;
};

function getTodayISO(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function createEmptyItem(): PedidoItem {
  return {
    produto: '',
    congelado: false,
    assadeiras: 0,
    assadeiraId: '',
    tipoCliente: null,
    observacao: '',
  };
}

function createInitialForm(): CreatePedidoData {
  const today = getTodayISO();
  return {
    dataPedido: today,
    dataFabricacao: today,
    cliente: '',
    observacao: '',
    itens: [createEmptyItem()],
  };
}

function reindexRecord<T>(record: Record<number, T>, removedIndex: number): Record<number, T> {
  const next: Record<number, T> = {};
  for (const [key, value] of Object.entries(record)) {
    const numericKey = Number(key);
    if (numericKey < removedIndex) next[numericKey] = value;
    if (numericKey > removedIndex) next[numericKey - 1] = value;
  }
  return next;
}

export default function CreatePedidoModal({
  isOpen,
  onClose,
  onSave,
  clientesOptions,
  produtosOptions,
  loading = false,
  visibleFields,
  labelsOverride,
}: CreatePedidoModalProps) {
  const [formData, setFormData] = useState<CreatePedidoData>(createInitialForm);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tiposClienteOptions, setTiposClienteOptions] = useState<string[]>([]);
  const [assadeiraOptionsByItem, setAssadeiraOptionsByItem] = useState<Record<number, AssadeiraOption[]>>({});
  const [boxUnitsByItem, setBoxUnitsByItem] = useState<Record<number, number | null>>({});
  const [assadeiraLoadingByItem, setAssadeiraLoadingByItem] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    setFormData(createInitialForm());
    setAssadeiraOptionsByItem({});
    setBoxUnitsByItem({});
    setAssadeiraLoadingByItem({});
    setMessage(null);
  }, [isOpen]);

  useEffect(() => {
    const loadTiposCliente = async () => {
      try {
        const res = await fetch('/api/options/embalagem?type=clientes');
        const data = await res.json();
        if (res.ok) {
          setTiposClienteOptions(data.options || []);
        }
      } catch (err) {
        console.error('Erro ao carregar tipos de cliente:', err);
      }
    };
    loadTiposCliente();
  }, []);

  const updateItem = (
    index: number,
    field: keyof PedidoItem,
    value: string | number | boolean | null | undefined,
  ) => {
    setFormData((prev) => ({
      ...prev,
      itens: prev.itens.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const loadAssadeirasForProduto = async (index: number, produtoNome: string) => {
    if (!produtoNome.trim()) return;
    try {
      setAssadeiraLoadingByItem((prev) => ({ ...prev, [index]: true }));
      const produtoRes = await fetch(`/api/produtos/${encodeURIComponent(produtoNome)}`);
      const produtoData = await produtoRes.json();
      if (!produtoRes.ok || !produtoData?.produto?.id) {
        throw new Error(produtoData.error || 'Produto inválido');
      }

      const produtoId = produtoData.produto.id as string;
      const produtoBoxUnits = (produtoData.produto.unPorCaixa as number | undefined) ?? null;
      const assadeirasRes = await fetch(`/api/produtos/${encodeURIComponent(produtoId)}/assadeiras`);
      const assadeirasData = await assadeirasRes.json();

      if (!assadeirasRes.ok) {
        throw new Error(assadeirasData.error || 'Produto sem assadeiras configuradas');
      }

      const options = (assadeirasData.assadeiras || []) as AssadeiraOption[];
      setAssadeiraOptionsByItem((prev) => ({ ...prev, [index]: options }));
      setBoxUnitsByItem((prev) => ({ ...prev, [index]: produtoBoxUnits }));

      if (options.length === 1) {
        updateItem(index, 'assadeiraId', options[0].id);
      }
    } catch (err) {
      setAssadeiraOptionsByItem((prev) => ({ ...prev, [index]: [] }));
      setBoxUnitsByItem((prev) => ({ ...prev, [index]: null }));
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao carregar assadeiras do produto',
      });
    } finally {
      setAssadeiraLoadingByItem((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleProdutoChange = async (index: number, value: string) => {
    updateItem(index, 'produto', value);
    updateItem(index, 'assadeiraId', '');
    setAssadeiraOptionsByItem((prev) => ({ ...prev, [index]: [] }));
    setBoxUnitsByItem((prev) => ({ ...prev, [index]: null }));

    if (produtosOptions.includes(value)) {
      await loadAssadeirasForProduto(index, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMessage(null);
      const validItems = formData.itens.filter(
        (item) => item.produto.trim() && item.assadeiras > 0 && Boolean(item.assadeiraId),
      );

      if (validItems.length === 0) {
        setMessage({
          type: 'error',
          text: 'Adicione ao menos um produto com latas e assadeira selecionada',
        });
        return;
      }

      await onSave({
        ...formData,
        itens: validItems,
      });
      onClose();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao criar pedido',
      });
    }
  };

  const handleClose = () => {
    setFormData(createInitialForm());
    setAssadeiraOptionsByItem({});
    setBoxUnitsByItem({});
    setAssadeiraLoadingByItem({});
    setMessage(null);
    onClose();
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      itens: [...prev.itens, createEmptyItem()],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.itens.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index),
    }));
    setAssadeiraOptionsByItem((prev) => reindexRecord(prev, index));
    setBoxUnitsByItem((prev) => reindexRecord(prev, index));
    setAssadeiraLoadingByItem((prev) => reindexRecord(prev, index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {labelsOverride?.title || 'Novo Pedido de Embalagem'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DateInput
                  label="Data de Produção"
                  value={formData.dataPedido}
                  onChange={(value) => setFormData((prev) => ({ ...prev, dataPedido: value }))}
                  required
                />

                {(visibleFields?.dataFabricacao ?? true) && (
                  <DateInput
                    label="Data de Fabricação na Etiqueta"
                    value={formData.dataFabricacao}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, dataFabricacao: value }))
                    }
                    required
                  />
                )}

                {(visibleFields?.cliente ?? true) && (
                  <AutocompleteInput
                    label="Cliente"
                    value={formData.cliente}
                    onChange={(value) => setFormData((prev) => ({ ...prev, cliente: value }))}
                    options={clientesOptions}
                    required
                  />
                )}

                {(visibleFields?.observacao ?? true) && (
                  <TextInput
                    label="Observação"
                    value={formData.observacao}
                    onChange={(value) => setFormData((prev) => ({ ...prev, observacao: value }))}
                    placeholder="Observações do cliente"
                  />
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Itens do Pedido</h3>
              </div>

              <div className="space-y-4">
                {formData.itens.map((item, index) => {
                  const assadeirasOptions = assadeiraOptionsByItem[index] || [];
                  const selectedAssadeira = assadeirasOptions.find((a) => a.id === item.assadeiraId);
                  const preview =
                    selectedAssadeira && item.assadeiras > 0
                      ? deriveQuantidadesFromAssadeiras({
                          assadeiras: item.assadeiras,
                          unidadesPorAssadeira: selectedAssadeira.unidadesPorAssadeiraEfetiva,
                          boxUnits: boxUnitsByItem[index] ?? undefined,
                        })
                      : null;

                  return (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-end mb-4">
                        {formData.itens.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AutocompleteInput
                          label="Produto"
                          value={item.produto}
                          onChange={(value) => {
                            void handleProdutoChange(index, value);
                          }}
                          onSelect={(value) => {
                            void handleProdutoChange(index, value);
                          }}
                          options={produtosOptions}
                          required
                          strict
                        />

                        <div className="flex items-center space-x-4">
                          {(visibleFields?.congelado ?? true) && (
                            <Switch
                              value={item.congelado}
                              onChange={(value) => updateItem(index, 'congelado', value)}
                            />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {(visibleFields?.pacotes ?? true) && (
                          <NumberInput
                            label="Latas (LT)"
                            value={item.assadeiras}
                            onChange={(value) => updateItem(index, 'assadeiras', value)}
                            min={0}
                            step={1}
                          />
                        )}

                        <div>
                          <label className="block text-base font-semibold text-gray-800 mb-3">
                            Assadeira
                          </label>
                          <select
                            value={item.assadeiraId}
                            onChange={(e) => updateItem(index, 'assadeiraId', e.target.value)}
                            className="w-full px-4 py-4 text-sm sm:text-base text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                            disabled={assadeiraLoadingByItem[index] || !item.produto}
                          >
                            <option value="">
                              {assadeiraLoadingByItem[index]
                                ? 'Carregando...'
                                : 'Selecione uma assadeira'}
                            </option>
                            {assadeirasOptions.map((assadeira) => (
                              <option key={assadeira.id} value={assadeira.id}>
                                {assadeira.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <AutocompleteInput
                            label="Tipo de Cliente (para meta de embalagem)"
                            value={item.tipoCliente || ''}
                            onChange={(value) => updateItem(index, 'tipoCliente', value || null)}
                            options={tiposClienteOptions}
                          />

                          <TextInput
                            label="Observação (para meta de embalagem)"
                            value={item.observacao || ''}
                            onChange={(value) => updateItem(index, 'observacao', value)}
                            placeholder="Observações do cliente"
                          />
                        </div>

                        {preview && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="text-sm text-blue-800">
                              <span className="font-semibold">Preview:</span> {item.assadeiras} LT
                              {' '}→ {preview.unidades} UN
                              {' '}• {preview.caixas} CX
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={addItem}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  + Adicionar Produto
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors font-medium"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                disabled={loading}
              >
                {loading ? 'Criando...' : 'Criar Pedido'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
