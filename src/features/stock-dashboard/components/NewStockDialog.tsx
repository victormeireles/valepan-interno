'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Quantidade } from '@/domain/types/inventario';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';
import {
  checkStockExistsAction,
  createStockAction,
  getStockTypesAction,
  getProductsAction,
} from '@/app/actions/stock-actions';

interface NewStockDialogProps {
  isOpen: boolean;
  loading?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type FormState = {
  estoqueNome: string;
  produto: string;
  quantidade: Quantidade;
};

type ConfirmationState = {
  show: boolean;
  currentQuantity: Quantidade;
  newQuantity: Quantidade;
};

const emptyQuantidade: Quantidade = {
  caixas: 0,
  pacotes: 0,
  unidades: 0,
  kg: 0,
};

export function NewStockDialog({
  isOpen,
  loading = false,
  onClose,
  onSuccess,
}: NewStockDialogProps) {
  const [formState, setFormState] = useState<FormState>({
    estoqueNome: '',
    produto: '',
    quantidade: emptyQuantidade,
  });
  const [tiposEstoque, setTiposEstoque] = useState<Array<{ nome: string }>>([]);
  const [produtos, setProdutos] = useState<Array<{ nome: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(
    null,
  );
  const [loadingTipos, startLoadingTipos] = useTransition();
  const [loadingProdutos, startLoadingProdutos] = useTransition();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormState({
        estoqueNome: '',
        produto: '',
        quantidade: emptyQuantidade,
      });
      setMessage(null);
      setConfirmation(null);
      carregarTiposEstoque();
      carregarProdutos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const carregarTiposEstoque = useCallback(() => {
    startLoadingTipos(async () => {
      try {
        const tipos = await getStockTypesAction();
        setTiposEstoque(tipos);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os tipos de estoque',
        );
      }
    });
  }, []);

  const carregarProdutos = useCallback(() => {
    startLoadingProdutos(async () => {
      try {
        const produtosList = await getProductsAction();
        setProdutos(produtosList);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os produtos',
        );
      }
    });
  }, []);

  const hasQuantidade = useMemo(() => {
    const q = formState.quantidade;
    return (
      q.caixas > 0 || q.pacotes > 0 || q.unidades > 0 || q.kg > 0
    );
  }, [formState.quantidade]);

  const quantidadeSomada = useMemo(() => {
    if (!confirmation) return null;
    return {
      caixas:
        confirmation.currentQuantity.caixas +
        confirmation.newQuantity.caixas,
      pacotes:
        confirmation.currentQuantity.pacotes +
        confirmation.newQuantity.pacotes,
      unidades:
        confirmation.currentQuantity.unidades +
        confirmation.newQuantity.unidades,
      kg: parseFloat(
        (
          confirmation.currentQuantity.kg + confirmation.newQuantity.kg
        ).toFixed(3),
      ),
    };
  }, [confirmation]);

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

    if (!formState.estoqueNome) {
      setMessage('Selecione o tipo de estoque');
      return;
    }

    if (!formState.produto) {
      setMessage('Selecione o produto');
      return;
    }

    if (!hasQuantidade) {
      setMessage('Defina ao menos uma quantidade');
      return;
    }

    // Se já tem confirmação pendente, não fazer nada
    if (confirmation?.show) {
      return;
    }

    // Verificar se já existe estoque
    try {
      setSaving(true);
      const checkResult = await checkStockExistsAction(
        formState.estoqueNome,
        formState.produto,
      );

      if (checkResult.exists && checkResult.currentQuantity) {
        // Mostrar confirmação
        setConfirmation({
          show: true,
          currentQuantity: checkResult.currentQuantity,
          newQuantity: formState.quantidade,
        });
        setSaving(false);
        return;
      }

      // Criar novo estoque
      await createStockAction({
        estoqueNome: formState.estoqueNome,
        produto: formState.produto,
        quantidade: formState.quantidade,
        action: 'replace',
      });

      onSuccess();
      onClose();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível criar o estoque',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAction = async (action: 'add' | 'replace') => {
    if (!confirmation) return;

    try {
      setSaving(true);
      setMessage(null);

      await createStockAction({
        estoqueNome: formState.estoqueNome,
        produto: formState.produto,
        quantidade: formState.quantidade,
        action,
      });

      setConfirmation(null);
      onSuccess();
      onClose();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar o estoque',
      );
    } finally {
      setSaving(false);
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
              Novo Estoque
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Lançar estoque manualmente
            </h2>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {message && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </div>
            )}

            {confirmation?.show && (
              <div className="rounded-2xl bg-yellow-50 border-2 border-yellow-400 px-4 py-4 space-y-4">
                <div className="font-semibold text-yellow-900">
                  ⚠️ Este produto já existe no estoque
                </div>
                <div className="text-sm text-yellow-800 space-y-2">
                  <p>
                    <strong>Tipo de Estoque:</strong> {formState.estoqueNome}
                  </p>
                  <p>
                    <strong>Produto:</strong> {formState.produto}
                  </p>
                  <div className="pt-2 border-t border-yellow-300 space-y-1">
                    <p>
                      <strong>Estoque Atual:</strong>{' '}
                      {formatQuantidade(confirmation.currentQuantity)}
                    </p>
                    <p>
                      <strong>Quantidade a Adicionar:</strong>{' '}
                      {formatQuantidade(confirmation.newQuantity)}
                    </p>
                    {quantidadeSomada && (
                      <p className="font-semibold">
                        <strong>Resultado (se somar):</strong>{' '}
                        {formatQuantidade(quantidadeSomada)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmation(null)}
                    className="flex-1 rounded-xl border border-yellow-300 px-3 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmAction('replace')}
                    disabled={saving}
                    className="flex-1 rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Substituir Estoque'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmAction('add')}
                    disabled={saving}
                    className="flex-1 rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Acrescentar ao Estoque'}
                  </button>
                </div>
              </div>
            )}

            {!confirmation?.show && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="text-sm font-medium text-gray-700 space-y-2">
                    <span>Tipo de Estoque</span>
                    <select
                      value={formState.estoqueNome}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          estoqueNome: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      required
                      disabled={loadingTipos}
                    >
                      <option value="">Selecione</option>
                      {tiposEstoque.map((tipo) => (
                        <option key={tipo.nome} value={tipo.nome}>
                          {tipo.nome}
                        </option>
                      ))}
                    </select>
                    {loadingTipos && (
                      <p className="text-xs text-gray-500">
                        Carregando tipos de estoque...
                      </p>
                    )}
                  </label>

                  <label className="text-sm font-medium text-gray-700 space-y-2">
                    <span>Produto</span>
                    <select
                      value={formState.produto}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          produto: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      required
                      disabled={loadingProdutos}
                    >
                      <option value="">Selecione</option>
                      {produtos.map((produto) => (
                        <option key={produto.nome} value={produto.nome}>
                          {produto.nome}
                        </option>
                      ))}
                    </select>
                    {loadingProdutos && (
                      <p className="text-xs text-gray-500">
                        Carregando produtos...
                      </p>
                    )}
                  </label>
                </div>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">
                      Quantidades
                    </p>
                    {hasQuantidade && (
                      <span className="text-xs text-gray-500">
                        {formatQuantidade(formState.quantidade)}
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
              </>
            )}
          </div>

          {!confirmation?.show && (
            <footer className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                disabled={saving || loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
                disabled={saving || loading}
              >
                {saving ? 'Verificando...' : 'Criar Estoque'}
              </button>
            </footer>
          )}
        </form>
      </div>
    </div>
  );
}

