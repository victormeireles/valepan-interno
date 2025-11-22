'use client';

import { useEffect, useState } from 'react';
import NumberInput from '@/components/FormControls/NumberInput';
import { Quantidade } from '@/domain/types/inventario';
import { StockEditorTarget } from '../hooks/useStockEditCoordinator';

interface EditStockModalProps {
  isOpen: boolean;
  target: StockEditorTarget | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (quantidade: Quantidade) => Promise<boolean>;
}

const QUANTIDADE_INICIAL: Quantidade = {
  caixas: 0,
  pacotes: 0,
  unidades: 0,
  kg: 0,
};

export const EditStockModal: React.FC<EditStockModalProps> = ({
  isOpen,
  target,
  saving,
  error,
  onClose,
  onConfirm,
}) => {
  const [quantidade, setQuantidade] =
    useState<Quantidade>(QUANTIDADE_INICIAL);

  useEffect(() => {
    if (target) {
      setQuantidade({ ...target.quantidade });
    } else {
      setQuantidade(QUANTIDADE_INICIAL);
    }
  }, [target]);

  if (!isOpen || !target) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onConfirm(quantidade);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Atualizar estoque
            </p>
            <h2 className="text-xl font-bold text-gray-900">
              {target.produto}
            </h2>
            <p className="text-sm text-gray-600">{target.cliente}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
            aria-label="Fechar modal de edição de estoque"
            disabled={saving}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberInput
              label="Caixas"
              value={quantidade.caixas}
              onChange={(value) =>
                setQuantidade((prev) => ({ ...prev, caixas: value }))
              }
              min={0}
              disabled={saving}
            />
            <NumberInput
              label="Pacotes"
              value={quantidade.pacotes}
              onChange={(value) =>
                setQuantidade((prev) => ({ ...prev, pacotes: value }))
              }
              min={0}
              disabled={saving}
            />
            <NumberInput
              label="Unidades"
              value={quantidade.unidades}
              onChange={(value) =>
                setQuantidade((prev) => ({ ...prev, unidades: value }))
              }
              min={0}
              disabled={saving}
            />
            <NumberInput
              label="Kg"
              value={quantidade.kg}
              onChange={(value) =>
                setQuantidade((prev) => ({ ...prev, kg: value }))
              }
              min={0}
              step={0.1}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

