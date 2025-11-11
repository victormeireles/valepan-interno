'use client';

import { useEffect, useId, useState } from 'react';
import { SaidaQuantidade } from '@/domain/types/saidas';
import PhotoUploader from '@/components/PhotoUploader';

interface NovaSaidaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    data: string;
    cliente: string;
    produto: string;
    observacao?: string;
    quantidade: SaidaQuantidade;
    foto?: File | null;
  }) => Promise<void>;
  clientesOptions: string[];
  produtosOptions: string[];
  loading?: boolean;
}

type FormState = {
  data: string;
  cliente: string;
  produto: string;
  observacao: string;
  quantidade: SaidaQuantidade;
};

type PhotoState = {
  file: File | null;
};

function getTodayISO(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_STATE: FormState = {
  data: getTodayISO(),
  cliente: '',
  produto: '',
  observacao: '',
  quantidade: {
    caixas: 0,
    pacotes: 0,
    unidades: 0,
    kg: 0,
  },
};

const DEFAULT_PHOTO: PhotoState = {
  file: null,
};

export default function NovaSaidaModal({
  isOpen,
  onClose,
  onSubmit,
  clientesOptions,
  produtosOptions,
  loading = false,
}: NovaSaidaModalProps) {
  const [formState, setFormState] = useState<FormState>(DEFAULT_STATE);
  const [photoState, setPhotoState] = useState<PhotoState>(DEFAULT_PHOTO);
  const [message, setMessage] = useState<string | null>(null);
  const clienteDatalistId = useId();
  const produtoDatalistId = useId();

  useEffect(() => {
    if (isOpen) {
      setFormState({
        ...DEFAULT_STATE,
        data: getTodayISO(),
      });
      setPhotoState(DEFAULT_PHOTO);
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateQuantidade = (field: keyof SaidaQuantidade, value: number) => {
    setFormState((prev) => ({
      ...prev,
      quantidade: {
        ...prev.quantidade,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const { data, cliente, produto, observacao, quantidade } = formState;

    if (!cliente || !produto) {
      setMessage('Informe cliente e produto.');
      return;
    }

    const hasQuantidade =
      quantidade.caixas > 0 ||
      quantidade.pacotes > 0 ||
      quantidade.unidades > 0 ||
      quantidade.kg > 0;

    if (!hasQuantidade) {
      setMessage('Informe ao menos uma quantidade.');
      return;
    }

    try {
      await onSubmit({
        data,
        cliente,
        produto,
        observacao: observacao || undefined,
        quantidade,
        foto: photoState.file,
      });
      onClose();
    } catch (error) {
      const text =
        error instanceof Error ? error.message : 'Erro ao criar saída';
      setMessage(text);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold">Nova Saída</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {message && (
            <div className="bg-red-900/30 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Data da Saída
              </label>
              <input
                type="date"
                value={formState.data}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, data: event.target.value }))
                }
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Cliente
              </label>
              <input
                list={clienteDatalistId}
                value={formState.cliente}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    cliente: event.target.value,
                  }))
                }
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Selecione ou digite"
                required
              />
              <datalist id={clienteDatalistId}>
                {clientesOptions.map((client) => (
                  <option key={client} value={client} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Produto
            </label>
            <input
              list={produtoDatalistId}
              value={formState.produto}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  produto: event.target.value,
                }))
              }
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Selecione ou digite"
              required
            />
            <datalist id={produtoDatalistId}>
              {produtosOptions.map((product) => (
                <option key={product} value={product} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Observação (opcional)
            </label>
            <input
              type="text"
              value={formState.observacao}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  observacao: event.target.value,
                }))
              }
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Informe detalhes da saída"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['caixas', 'pacotes', 'unidades', 'kg'] as Array<keyof SaidaQuantidade>).map((field) => (
              <div key={field} className="space-y-2">
                <label className="text-sm font-medium text-gray-300 capitalize">
                  {field}
                </label>
                <input
                  type="number"
                  min={0}
                  step={field === 'kg' ? 0.01 : 1}
                  value={formState.quantidade[field]}
                  onChange={(event) =>
                    updateQuantidade(field, Number(event.target.value))
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">
              Foto (opcional)
            </label>
            <PhotoUploader
              onPhotoSelect={(file) => setPhotoState({ file })}
              onPhotoRemove={() => setPhotoState({ file: null })}
              loading={loading}
              currentPhotoUrl={undefined}
            />
          </div>

          <footer className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Criar Saída'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}


