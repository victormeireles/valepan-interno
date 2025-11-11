'use client';

import { useEffect, useState } from 'react';
import PhotoUploader from '@/components/PhotoUploader';
import { SaidaQuantidade } from '@/domain/types/saidas';

interface SaidasRealizadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (result: {
    realizado: SaidaQuantidade;
    uploadFile?: File;
    removeExistingPhoto?: boolean;
  }) => Promise<void>;
  loading?: boolean;
  meta: SaidaQuantidade;
  initialRealizado?: SaidaQuantidade;
  existingPhotoUrl?: string;
  cliente: string;
  produto: string;
}

type FormState = SaidaQuantidade;

function buildInitialState(initial?: SaidaQuantidade): FormState {
  return {
    caixas: initial?.caixas || 0,
    pacotes: initial?.pacotes || 0,
    unidades: initial?.unidades || 0,
    kg: initial?.kg || 0,
  };
}

export default function SaidasRealizadoModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  meta,
  initialRealizado,
  existingPhotoUrl,
  cliente,
  produto,
}: SaidasRealizadoModalProps) {
  const [formState, setFormState] = useState<FormState>(() =>
    buildInitialState(initialRealizado),
  );
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormState(buildInitialState(initialRealizado));
      setSelectedPhoto(null);
      setRemoveExistingPhoto(false);
      setMessage(null);
    }
  }, [isOpen, initialRealizado]);

  if (!isOpen) return null;

  const updateField = (field: keyof FormState, value: number) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (
      formState.caixas < 0 ||
      formState.pacotes < 0 ||
      formState.unidades < 0 ||
      formState.kg < 0
    ) {
      setMessage('Valores não podem ser negativos.');
      return;
    }

    try {
      await onSubmit({
        realizado: formState,
        uploadFile: selectedPhoto || undefined,
        removeExistingPhoto,
      });
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao salvar produção';
      setMessage(message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-gray-800 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold">Atualizar Saída</h2>
            <p className="text-sm text-gray-400 mt-1">
              {cliente} • {produto}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {message && (
            <div className="bg-red-900/30 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
              {message}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm uppercase tracking-widest text-gray-400 mb-4">
                Meta
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-400">Caixas</span>
                  <span className="font-semibold text-white">
                    {meta.caixas || 0}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-400">Pacotes</span>
                  <span className="font-semibold text-white">
                    {meta.pacotes || 0}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-400">Unidades</span>
                  <span className="font-semibold text-white">
                    {meta.unidades || 0}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-400">Kg</span>
                  <span className="font-semibold text-white">
                    {meta.kg || 0}
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              {(['caixas', 'pacotes', 'unidades', 'kg'] as Array<
                keyof FormState
              >).map((field) => (
                <div key={field} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300 capitalize">
                    {field}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={field === 'kg' ? 0.01 : 1}
                    value={formState[field]}
                    onChange={(event) =>
                      updateField(field, Number(event.target.value))
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm uppercase tracking-widest text-gray-400">
                Foto da Saída
              </h3>
              {existingPhotoUrl && !selectedPhoto && !removeExistingPhoto && (
                <div className="flex items-center gap-3">
                  <a
                    href={existingPhotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Ver foto atual
                  </a>
                  <button
                    type="button"
                    onClick={() => setRemoveExistingPhoto(true)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remover foto atual
                  </button>
                </div>
              )}
            </div>

            <PhotoUploader
              onPhotoSelect={(file) => {
                setSelectedPhoto(file);
                setRemoveExistingPhoto(false);
              }}
              onPhotoRemove={() => {
                setSelectedPhoto(null);
              }}
              loading={loading}
              currentPhotoUrl={existingPhotoUrl}
            />

            {removeExistingPhoto && (
              <div className="text-sm text-yellow-300 bg-yellow-900/30 border border-yellow-700 px-3 py-2 rounded-lg">
                A foto atual será removida ao salvar.
              </div>
            )}
          </section>

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
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}


