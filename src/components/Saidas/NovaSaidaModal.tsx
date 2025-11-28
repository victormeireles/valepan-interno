'use client';

import { useEffect, useState } from 'react';
import { SaidaQuantidade } from '@/domain/types/saidas';
import PhotoUploader from '@/components/PhotoUploader';
import AutocompleteInput from '@/components/FormControls/AutocompleteInput';

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
  // Estado para valores de display (vazio quando zero)
  const [quantidadeDisplayValues, setQuantidadeDisplayValues] = useState<{
    caixas: string | number;
    pacotes: string | number;
    unidades: string | number;
    kg: string | number;
  }>({
    caixas: '',
    pacotes: '',
    unidades: '',
    kg: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormState({
        ...DEFAULT_STATE,
        data: getTodayISO(),
      });
      setPhotoState(DEFAULT_PHOTO);
      setMessage(null);
      setQuantidadeDisplayValues({
        caixas: '',
        pacotes: '',
        unidades: '',
        kg: '',
      });
    }
  }, [isOpen]);

  // Sincronizar display values quando formState.quantidade mudar externamente
  useEffect(() => {
    setQuantidadeDisplayValues({
      caixas: formState.quantidade.caixas === 0 ? '' : formState.quantidade.caixas.toString(),
      pacotes: formState.quantidade.pacotes === 0 ? '' : formState.quantidade.pacotes.toString(),
      unidades: formState.quantidade.unidades === 0 ? '' : formState.quantidade.unidades.toString(),
      kg: formState.quantidade.kg === 0 ? '' : formState.quantidade.kg.toString(),
    });
  }, [formState.quantidade]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let previousOverflow = '';
    if (typeof document !== 'undefined') {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [isOpen, onClose]);

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

  const handleQuantidadeChange = (field: keyof SaidaQuantidade, inputValue: string) => {
    // Atualizar display value
    setQuantidadeDisplayValues((prev) => ({
      ...prev,
      [field]: inputValue,
    }));

    // Converter para número e atualizar formState
    if (inputValue === '') {
      updateQuantidade(field, 0);
    } else {
      const numValue = field === 'kg' ? parseFloat(inputValue) : parseInt(inputValue);
      if (!isNaN(numValue)) {
        updateQuantidade(field, numValue);
      }
    }
  };

  const handleQuantidadeBlur = (field: keyof SaidaQuantidade) => {
    // Normalizar display value no blur
    const currentValue = formState.quantidade[field];
    setQuantidadeDisplayValues((prev) => ({
      ...prev,
      [field]: currentValue === 0 ? '' : currentValue.toString(),
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
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/70 px-4 py-6 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nova-saida-title"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-none bg-gray-900 text-white shadow-2xl sm:rounded-2xl max-h-[90vh]"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex h-full flex-1 flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-gray-800 px-5 py-4 sm:px-6">
            <h2 id="nova-saida-title" className="text-lg font-semibold sm:text-xl">
              Nova Saída
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-200"
              aria-label="Fechar modal"
            >
              ×
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-6">
              {message && (
                <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-100">
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Data da Saída</label>
                  <input
                    type="date"
                    value={formState.data}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, data: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <AutocompleteInput
                    label="Cliente"
                    value={formState.cliente}
                    onChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        cliente: value,
                      }))
                    }
                    options={clientesOptions}
                    placeholder="Selecione ou digite"
                    required
                    strict
                  />
                </div>
              </div>

              <div className="space-y-2">
                <AutocompleteInput
                  label="Produto"
                  value={formState.produto}
                  onChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      produto: value,
                    }))
                  }
                  options={produtosOptions}
                  placeholder="Selecione ou digite"
                  required
                  strict
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Observação (opcional)</label>
                <input
                  type="text"
                  value={formState.observacao}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      observacao: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  placeholder="Informe detalhes da saída"
                />
              </div>

              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Quantidades
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(['caixas', 'pacotes', 'unidades', 'kg'] as Array<keyof SaidaQuantidade>).map(
                    (field) => (
                      <div key={field} className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 capitalize">
                          {field}
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={field === 'kg' ? 0.01 : 1}
                          inputMode={field === 'kg' ? 'decimal' : 'numeric'}
                          value={quantidadeDisplayValues[field]}
                          onChange={(event) =>
                            handleQuantidadeChange(field, event.target.value)
                          }
                          onBlur={() => handleQuantidadeBlur(field)}
                          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                        />
                      </div>
                    ),
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Foto (opcional)</span>
                  {photoState.file && (
                    <button
                      type="button"
                      onClick={() => setPhotoState({ file: null })}
                      className="text-xs font-medium text-red-300 transition hover:text-red-200"
                    >
                      Remover arquivo
                    </button>
                  )}
                </div>
                <PhotoUploader
                  onPhotoSelect={(file) => setPhotoState({ file })}
                  onPhotoRemove={() => setPhotoState({ file: null })}
                  loading={loading}
                  currentPhotoUrl={undefined}
                />
              </section>
            </div>
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-gray-800 bg-gray-900 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-5 py-3 text-sm font-medium text-gray-300 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
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


