'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Quantidade } from '@/domain/types/inventario';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';
import PhotoUploader from '@/components/PhotoUploader';
import { getClientsForStockLocationAction } from '@/app/actions/stock-actions';

interface StockOutflowDialogProps {
  isOpen: boolean;
  estoqueNome: string;
  produto: string;
  quantidadeDisponivel: Quantidade;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    data: string;
    clienteDestino: string;
    observacao?: string;
    quantidade: Quantidade;
    foto?: File | null;
  }) => Promise<void>;
}

type FormState = {
  data: string;
  clienteDestino: string;
  observacao: string;
  quantidade: Quantidade;
};

const getTodayISO = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const emptyQuantidade: Quantidade = {
  caixas: 0,
  pacotes: 0,
  unidades: 0,
  kg: 0,
};

export function StockOutflowDialog({
  isOpen,
  estoqueNome,
  produto,
  quantidadeDisponivel,
  loading = false,
  onClose,
  onSubmit,
}: StockOutflowDialogProps) {
  const [formState, setFormState] = useState<FormState>({
    data: getTodayISO(),
    clienteDestino: '',
    observacao: '',
    quantidade: emptyQuantidade,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [clientes, setClientes] = useState<string[]>([]);
  const [clientesMessage, setClientesMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showExceedConfirmation, setShowExceedConfirmation] = useState(false);
  const [loadingClientes, startLoadingClientes] = useTransition();

  const carregarClientes = useCallback(() => {
    startLoadingClientes(async () => {
      try {
        setClientesMessage(null);
        const response = await getClientsForStockLocationAction(estoqueNome);
        const nomes = response.map((cliente) => cliente.nomeFantasia);
        setClientes([...new Set([...nomes, 'Amostra'])]);
      } catch (error) {
        setClientesMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os clientes',
        );
        setClientes(['Amostra']);
      }
    });
  }, [estoqueNome]);

  useEffect(() => {
    if (isOpen) {
      setFormState({
        data: getTodayISO(),
        clienteDestino: '',
        observacao: '',
        quantidade: emptyQuantidade,
      });
      setPhotoFile(null);
      setMessage(null);
      setShowExceedConfirmation(false);
      carregarClientes();
    }
  }, [isOpen, estoqueNome, carregarClientes]);

  const hasQuantidade = useMemo(() => {
    const q = formState.quantidade;
    return (
      q.caixas > 0 || q.pacotes > 0 || q.unidades > 0 || q.kg > 0
    );
  }, [formState.quantidade]);

  const excedeEstoque = useMemo(() => {
    const saida = formState.quantidade;
    const disponivel = quantidadeDisponivel;
    
    return (
      saida.caixas > disponivel.caixas ||
      saida.pacotes > disponivel.pacotes ||
      saida.unidades > disponivel.unidades ||
      saida.kg > disponivel.kg
    );
  }, [formState.quantidade, quantidadeDisponivel]);

  if (!isOpen) return null;

  const handleQuantidadeChange = (
    field: keyof Quantidade,
    value: string,
  ) => {
    setFormState((prev) => ({
      ...prev,
      quantidade: {
        ...prev.quantidade,
        [field]:
          field === 'kg'
            ? Number(value || 0)
            : parseInt(value || '0', 10),
      },
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!formState.clienteDestino) {
      setMessage('Escolha o cliente que receberá esta saída');
      return;
    }

    if (!hasQuantidade) {
      setMessage('Defina ao menos uma quantidade para a saída');
      return;
    }

    // Se exceder o estoque e ainda não confirmou, mostrar confirmação
    if (excedeEstoque && !showExceedConfirmation) {
      setShowExceedConfirmation(true);
      return;
    }

    try {
      await onSubmit({
        data: formState.data,
        clienteDestino: formState.clienteDestino,
        observacao: formState.observacao || undefined,
        quantidade: formState.quantidade,
        foto: photoFile,
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar esta saída agora.',
      );
      setShowExceedConfirmation(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          <header className="px-6 py-5 border-b border-gray-100 space-y-2">
            <div className="text-xs uppercase tracking-[0.3em] text-gray-400">
              Saída direta do estoque
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {produto}
            </h2>
            <p className="text-sm text-gray-500 flex flex-wrap gap-2">
              <span className="font-semibold text-gray-900">
                {estoqueNome}
              </span>
              <span>•</span>
              <span>
                Disponível:{' '}
                <strong>{formatQuantidade(quantidadeDisponivel)}</strong>
              </span>
            </p>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {message && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </div>
            )}

            {excedeEstoque && !showExceedConfirmation && (
              <div className="rounded-2xl bg-yellow-50 border-2 border-yellow-300 px-4 py-3 text-sm text-yellow-800">
                <div className="font-semibold mb-1">⚠️ Atenção: Saída maior que o estoque disponível</div>
                <div className="text-xs text-yellow-700">
                  Disponível: {formatQuantidade(quantidadeDisponivel)} • 
                  Solicitado: {formatQuantidade(formState.quantidade)}
                </div>
              </div>
            )}

            {showExceedConfirmation && (
              <div className="rounded-2xl bg-orange-50 border-2 border-orange-400 px-4 py-3 space-y-3">
                <div className="font-semibold text-orange-900">
                  ⚠️ Confirmar saída maior que o estoque?
                </div>
                <div className="text-sm text-orange-800 space-y-1">
                  <p>
                    <strong>Disponível:</strong> {formatQuantidade(quantidadeDisponivel)}
                  </p>
                  <p>
                    <strong>Solicitado:</strong> {formatQuantidade(formState.quantidade)}
                  </p>
                  <p className="mt-2">
                    O estoque ficará <strong>negativo</strong> após esta saída. Deseja continuar?
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExceedConfirmation(false)}
                    className="flex-1 rounded-xl border border-orange-300 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await onSubmit({
                          data: formState.data,
                          clienteDestino: formState.clienteDestino,
                          observacao: formState.observacao || undefined,
                          quantidade: formState.quantidade,
                          foto: photoFile,
                        });
                      } catch (error) {
                        setMessage(
                          error instanceof Error
                            ? error.message
                            : 'Não foi possível registrar esta saída agora.',
                        );
                        setShowExceedConfirmation(false);
                      }
                    }}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Sim, continuar'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium text-gray-700 space-y-2">
                <span>Data da saída</span>
                <input
                  type="date"
                  value={formState.data}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      data: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
              </label>

              <label className="text-sm font-medium text-gray-700 space-y-2">
                <span>Cliente destino</span>
                <select
                  value={formState.clienteDestino}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      clienteDestino: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                >
                  <option value="">Selecione</option>
                  {clientes.map((cliente) => (
                    <option key={cliente} value={cliente}>
                      {cliente}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  {loadingClientes && (
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                  {clientesMessage
                    ? clientesMessage
                    : 'Lista filtrada por tipo de estoque'}
                </p>
              </label>
            </div>

            <label className="text-sm font-medium text-gray-700 space-y-2 block">
              <span>Observação (opcional)</span>
              <textarea
                value={formState.observacao}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    observacao: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                rows={2}
                placeholder="Ex: saída dia 01/01"
              />
            </label>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">
                  Quantidades da saída
                </p>
                {hasQuantidade ? (
                  <span className="text-xs text-gray-500">
                    Será debitado: {formatQuantidade(formState.quantidade)}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">
                    Defina ao menos um valor
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['caixas', 'pacotes', 'unidades', 'kg'] as Array<
                  keyof Quantidade
                >).map((field) => (
                  <label
                    key={field}
                    className="text-sm text-gray-600 space-y-2"
                  >
                    <span className="capitalize">{field}</span>
                    <input
                      type="number"
                      min={0}
                      step={field === 'kg' ? 0.01 : 1}
                      value={
                        formState.quantidade[field] === 0
                          ? ''
                          : formState.quantidade[field]
                      }
                      onChange={(event) =>
                        handleQuantidadeChange(field, event.target.value)
                      }
                      className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="0"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">
                  Foto opcional
                </p>
                {photoFile && (
                  <button
                    type="button"
                    onClick={() => setPhotoFile(null)}
                    className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                  >
                    Remover
                  </button>
                )}
              </div>
              <PhotoUploader
                onPhotoSelect={setPhotoFile}
                onPhotoRemove={() => setPhotoFile(null)}
                loading={loading}
              />
            </section>
          </div>

          <footer className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
              disabled={loading || showExceedConfirmation}
            >
              {loading ? 'Enviando...' : 'Registrar saída'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}


