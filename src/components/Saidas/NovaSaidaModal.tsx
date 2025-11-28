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

  // Estado para animação
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnimating(true);
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
    } else {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
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

  const handleClose = () => {
    onClose();
  };

  if (!isOpen && !animating) return null;

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
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="nova-saida-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div
        className={`relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] transition-all duration-300 transform ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex h-full flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
            <div>
              <h2 id="nova-saida-title" className="text-2xl font-bold text-gray-900">
                Nova Saída
              </h2>
              <p className="text-sm text-gray-500 mt-1">Preencha os dados da saída.</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fechar modal"
            >
              <span className="material-icons text-xl">close</span>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="space-y-6">
              {message && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-600 flex items-center gap-2">
                  <span className="material-icons text-sm">error</span>
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Data da Saída</label>
                  <input
                    type="date"
                    value={formState.data}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, data: event.target.value }))
                    }
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
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

              <div className="space-y-1.5">
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

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">Observação (opcional)</label>
                <input
                  type="text"
                  value={formState.observacao}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      observacao: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-gray-400"
                  placeholder="Informe detalhes da saída"
                />
              </div>

              <section className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">
                  Quantidades
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(['caixas', 'pacotes', 'unidades', 'kg'] as Array<keyof SaidaQuantidade>).map(
                    (field) => (
                      <div key={field} className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 ml-1 capitalize">
                          {field}
                        </label>
                        <div className="relative group">
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
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-gray-400"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                            {field === 'kg' ? 'kg' : 'un'}
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>

              <section className="space-y-3 pt-2">
                <div className="flex items-center justify-between ml-1">
                  <span className="text-sm font-semibold text-gray-700">Foto (opcional)</span>
                  {photoState.file && (
                    <button
                      type="button"
                      onClick={() => setPhotoState({ file: null })}
                      className="text-xs font-medium text-rose-500 transition hover:text-rose-700"
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

          <footer className="flex items-center justify-end gap-3 px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 sm:flex-none px-6 py-3.5 text-gray-700 bg-white border-2 border-gray-100 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-200 transition-all disabled:opacity-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none px-8 py-3.5 text-white bg-gray-900 rounded-xl font-semibold shadow-lg shadow-gray-900/20 hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                 <>
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   <span>Salvando...</span>
                 </>
               ) : (
                 'Criar Saída'
               )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
