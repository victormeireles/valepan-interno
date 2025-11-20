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
  onSaveSuccess?: () => Promise<void>;
  loading?: boolean;
  meta: SaidaQuantidade;
  initialRealizado?: SaidaQuantidade;
  existingPhotoUrl?: string;
  existingPhotoId?: string;
  cliente: string;
  produto: string;
  rowId?: number;
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
  onSaveSuccess,
  loading = false,
  meta,
  initialRealizado,
  existingPhotoUrl,
  existingPhotoId,
  cliente,
  produto,
  rowId,
}: SaidasRealizadoModalProps) {
  const [formState, setFormState] = useState<FormState>(() =>
    buildInitialState(initialRealizado),
  );
  // Estado para valores de display (vazio quando zero)
  const [displayValues, setDisplayValues] = useState<{
    caixas: string | number;
    pacotes: string | number;
    unidades: string | number;
    kg: string | number;
  }>(() => {
    const initialState = buildInitialState(initialRealizado);
    return {
      caixas: initialState.caixas === 0 ? '' : initialState.caixas.toString(),
      pacotes: initialState.pacotes === 0 ? '' : initialState.pacotes.toString(),
      unidades: initialState.unidades === 0 ? '' : initialState.unidades.toString(),
      kg: initialState.kg === 0 ? '' : initialState.kg.toString(),
    };
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initialState = buildInitialState(initialRealizado);
      setFormState(initialState);
      setDisplayValues({
        caixas: initialState.caixas === 0 ? '' : initialState.caixas.toString(),
        pacotes: initialState.pacotes === 0 ? '' : initialState.pacotes.toString(),
        unidades: initialState.unidades === 0 ? '' : initialState.unidades.toString(),
        kg: initialState.kg === 0 ? '' : initialState.kg.toString(),
      });
      setSelectedPhoto(null);
      setRemoveExistingPhoto(false);
      setMessage(null);
    }
  }, [isOpen, initialRealizado]);

  // Sincronizar display values quando formState mudar externamente
  useEffect(() => {
    setDisplayValues({
      caixas: formState.caixas === 0 ? '' : formState.caixas.toString(),
      pacotes: formState.pacotes === 0 ? '' : formState.pacotes.toString(),
      unidades: formState.unidades === 0 ? '' : formState.unidades.toString(),
      kg: formState.kg === 0 ? '' : formState.kg.toString(),
    });
  }, [formState]);

  if (!isOpen) return null;

  const updateField = (field: keyof FormState, value: number) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleFieldChange = (field: keyof FormState, inputValue: string) => {
    // Atualizar display value
    setDisplayValues((prev) => ({
      ...prev,
      [field]: inputValue,
    }));

    // Converter para número e atualizar formState
    if (inputValue === '') {
      updateField(field, 0);
    } else {
      const numValue = field === 'kg' ? parseFloat(inputValue) : parseInt(inputValue);
      if (!isNaN(numValue)) {
        updateField(field, numValue);
      }
    }
  };

  const handleFieldBlur = (field: keyof FormState) => {
    // Normalizar display value no blur
    const currentValue = formState[field];
    setDisplayValues((prev) => ({
      ...prev,
      [field]: currentValue === 0 ? '' : currentValue.toString(),
    }));
  };

  // Verificar se é saída parcial (realizado < meta)
  const isPartialSaida = (): boolean => {
    if (!meta) return false;

    return (
      (meta.caixas > 0 && formState.caixas < meta.caixas) ||
      (meta.pacotes > 0 && formState.pacotes < meta.pacotes) ||
      (meta.unidades > 0 && formState.unidades < meta.unidades) ||
      (meta.kg > 0 && formState.kg < meta.kg)
    );
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
      setMessage({ type: 'error', text: 'Valores não podem ser negativos.' });
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        realizado: formState,
        uploadFile: selectedPhoto || undefined,
        removeExistingPhoto,
      });
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao salvar produção';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler para salvar saída parcial
  const handleSavePartial = async (event: React.FormEvent) => {
    event.preventDefault();

    // Prevenir múltiplos cliques
    if (isSubmitting || !rowId) return;

    // Executar o salvamento parcial
    await executeSavePartial();
  };

  const executeSavePartial = async () => {
    if (!rowId) return;
    
    try {
      setIsSubmitting(true);
      setMessage(null);

      // 1. Chamar API de salvar parcial PRIMEIRO (sem fazer upload de fotos novas)
      const res = await fetch(`/api/producao/saidas/${rowId}/partial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caixas: formState.caixas,
          pacotes: formState.pacotes,
          unidades: formState.unidades,
          kg: formState.kg,
          // Incluir dados de foto JÁ EXISTENTES (não novas)
          fotoUrl: existingPhotoUrl,
          fotoId: existingPhotoId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar saída parcial');
      }

      // 2. Se houver foto nova para upload, fazer upload para a NOVA LINHA
      const novaLinhaRowId = data.novaLinhaRowId;
      if (selectedPhoto && novaLinhaRowId) {
        setPhotoLoading(true);
        const formDataPhoto = new FormData();
        formDataPhoto.append('photo', selectedPhoto);
        formDataPhoto.append('rowId', novaLinhaRowId.toString()); // Usar rowId da NOVA linha
        formDataPhoto.append('photoType', 'saida');
        formDataPhoto.append('process', 'saidas');

        const uploadRes = await fetch('/api/upload/photo', {
          method: 'POST',
          body: formDataPhoto,
        });
        
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json();
          throw new Error(uploadData.error || 'Erro ao fazer upload da foto para nova linha');
        }
        
        // Atualizar a nova linha com os dados da foto
        const uploadData = await uploadRes.json();
        await fetch(`/api/producao/saidas/${novaLinhaRowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            realizado: formState,
            fotoUrl: uploadData.photoUrl,
            fotoId: uploadData.photoId,
          }),
        });
        
        setPhotoLoading(false);
      }

      // 4. Recarregar dados do painel se callback fornecido
      if (onSaveSuccess) {
        await onSaveSuccess();
      }

      // Fechar modal imediatamente após salvar com sucesso
      onClose();
    } catch (error) {
      setPhotoLoading(false);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao salvar saída parcial' 
      });
    } finally {
      setIsSubmitting(false);
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
            <div className={`px-4 py-3 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-900/30 border-green-700 text-green-100' 
                : 'bg-red-900/30 border-red-700 text-red-100'
            }`}>
              {message.text}
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
                    value={displayValues[field]}
                    onChange={(event) =>
                      handleFieldChange(field, event.target.value)
                    }
                    onBlur={() => handleFieldBlur(field)}
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
              loading={loading || photoLoading}
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
              disabled={loading || isSubmitting}
            >
              Cancelar
            </button>
            
            {/* Botão Salvar Parcial */}
            {rowId && (
              <button
                type="button"
                onClick={handleSavePartial}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[140px]"
                disabled={loading || isSubmitting || !isPartialSaida()}
                title={!isPartialSaida() ? 'Disponível apenas quando realizado é menor que a meta' : 'Salvar saída parcial e criar nova meta com a diferença'}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {photoLoading ? 'Enviando foto...' : 'Salvando...'}
                  </>
                ) : (
                  'Salvar Parcial'
                )}
              </button>
            )}

            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[140px]"
              disabled={loading || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {photoLoading ? 'Enviando foto...' : 'Salvando...'}
                </>
              ) : (
                'Salvar'
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}


