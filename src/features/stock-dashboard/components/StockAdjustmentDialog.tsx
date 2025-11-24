'use client';

import { useEffect, useState } from 'react';
import { Quantidade } from '@/domain/types/inventario';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';

interface StockAdjustmentDialogProps {
  isOpen: boolean;
  produto: string;
  estoqueNome: string;
  quantidadeAtual: Quantidade;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (quantidade: Quantidade) => Promise<void> | void;
}

const zeroQuantidade: Quantidade = {
  caixas: 0,
  pacotes: 0,
  unidades: 0,
  kg: 0,
};

export function StockAdjustmentDialog({
  isOpen,
  produto,
  estoqueNome,
  quantidadeAtual,
  loading = false,
  onClose,
  onConfirm,
}: StockAdjustmentDialogProps) {
  const [quantidadeForm, setQuantidadeForm] = useState<Quantidade>(
    quantidadeAtual ?? zeroQuantidade,
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuantidadeForm(quantidadeAtual ?? zeroQuantidade);
      setMessage(null);
    }
  }, [isOpen, quantidadeAtual]);

  if (!isOpen) return null;

  const handleChange = (
    field: keyof Quantidade,
    value: string,
  ) => {
    setQuantidadeForm((prev) => ({
      ...prev,
      [field]:
        field === 'kg'
          ? Number(value || 0)
          : parseInt(value || '0', 10),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await onConfirm(quantidadeForm);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível ajustar este estoque agora.',
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {message && (
            <div className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">
              {message}
            </div>
          )}

          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
              Ajustar estoque
            </p>
            <h2 className="text-xl font-bold text-gray-900">
              {produto}
            </h2>
            <p className="text-sm text-gray-500">
              {estoqueNome} • Atual:{' '}
              <span className="font-semibold text-gray-900">
                {formatQuantidade(quantidadeAtual)}
              </span>
            </p>
          </header>

          <section className="space-y-3">
            <p className="text-sm font-medium text-gray-800">
              Defina a nova quantidade
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['caixas', 'pacotes', 'unidades', 'kg'] as Array<
                keyof Quantidade
              >).map((field) => (
                <label
                  key={field}
                  className="text-sm text-gray-600 space-y-1"
                >
                  <span className="block capitalize">
                    {field}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={field === 'kg' ? 0.01 : 1}
                    value={
                      quantidadeForm[field] === 0
                        ? ''
                        : quantidadeForm[field]
                    }
                    onChange={(event) =>
                      handleChange(field, event.target.value)
                    }
                    className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="0"
                  />
                </label>
              ))}
            </div>
          </section>

          <footer className="flex flex-col sm:flex-row gap-3">
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
              className="w-full rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Aplicar ajuste'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

