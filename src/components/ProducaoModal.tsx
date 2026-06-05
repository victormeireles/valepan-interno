'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import NumberInput from './FormControls/NumberInput';
import PhotoUploader from './PhotoUploader';
import PhotoManager from './PhotoManager';
import { ProducaoData } from '@/domain/types';
import { PhotoValidator } from '@/domain/validators/PhotoValidator';
import {
  resolverCamposRealizadoEmbalagem,
  type CamposRealizadoEmbalagem,
} from '@/domain/embalagem/painel-quantidade';


interface ProducaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProducaoData) => Promise<void>;
  onSaveSuccess?: () => Promise<void>;
  initialData?: ProducaoData;
  loading?: boolean;
  produto?: string;
  cliente?: string;
  rowId?: number;
  /** Novo lote via botão + — salva por pedido canônico no DB. */
  pedidoEmbalagemId?: string;
  congelado?: 'Sim' | 'Não';
  pedidoQuantidades?: {
    caixas: number;
    pacotes: number;
    unidades: number;
    kg: number;
  };
  pedidoMetaOriginal?: {
    caixas: number;
    pacotes: number;
    unidades: number;
    kg: number;
  };
  mode?: 'embalagem' | 'forno' | 'fermentacao' | 'resfriamento';
  /** Aberto via botão "+" (novo lote), não edição de lote existente. */
  isNewLote?: boolean;
}

export default function ProducaoModal({
  isOpen,
  onClose,
  onSave,
  onSaveSuccess,
  initialData,
  loading = false,
  produto = '',
  cliente = '',
  rowId,
  pedidoEmbalagemId,
  congelado = 'Não',
  pedidoQuantidades,
  pedidoMetaOriginal,
  mode = 'embalagem',
  isNewLote = false,
}: ProducaoModalProps) {
  const [formData, setFormData] = useState<ProducaoData>({
    caixas: 0,
    pacotes: 0,
    unidades: 0,
    kg: 0,
    obsEmbalagem: '',
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [photoFiles, setPhotoFiles] = useState<{
    pacote: File | null;
    etiqueta: File | null;
    pallet: File | null;
  }>({
    pacote: null,
    etiqueta: null,
    pallet: null,
  });
  const [photoLoading, setPhotoLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<'submit' | 'partial' | null>(null);

  const camposVisiveis: CamposRealizadoEmbalagem = useMemo(() => {
    if (mode !== 'embalagem' || !pedidoMetaOriginal) {
      return { caixas: true, pacotes: true, unidades: true, kg: true };
    }
    return resolverCamposRealizadoEmbalagem(pedidoMetaOriginal);
  }, [mode, pedidoMetaOriginal]);

  const sanitizeQuantidades = useCallback(
    (data: ProducaoData): ProducaoData => {
      if (mode !== 'embalagem') return data;
      return {
        ...data,
        caixas: camposVisiveis.caixas ? data.caixas : 0,
        pacotes: camposVisiveis.pacotes ? data.pacotes : 0,
        unidades: camposVisiveis.unidades ? data.unidades : 0,
        kg: camposVisiveis.kg ? data.kg : 0,
      };
    },
    [mode, camposVisiveis],
  );

  const totalQtyVisivel = useCallback(
    (data: ProducaoData) => {
      const q = sanitizeQuantidades(data);
      return (q.caixas || 0) + (q.pacotes || 0) + (q.unidades || 0) + (q.kg || 0);
    },
    [sanitizeQuantidades],
  );

  // Sincronizar só ao abrir o modal ou trocar a linha. Não listar `initialData` nas deps:
  // o pai recria o objeto a cada render e reaplicaria valores antigos por cima do que o usuário digitou.
  useEffect(() => {
    if (!isOpen || !initialData) return;
    if (isNewLote && pedidoEmbalagemId) {
      setFormData(initialData);
      return;
    }
    if (rowId == null) return;
    setFormData(initialData);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `initialData` omitido: o pai recria o objeto a cada render
  }, [isOpen, rowId, isNewLote, pedidoEmbalagemId]);

  const buildLotePayload = useCallback(
    (data: ProducaoData) => ({
      caixas: data.caixas,
      pacotes: data.pacotes,
      unidades: data.unidades,
      kg: data.kg,
      congelado,
      obsEmbalagem: data.obsEmbalagem || '',
      pacoteFotoUrl: data.pacoteFotoUrl,
      pacoteFotoId: data.pacoteFotoId,
      pacoteFotoUploadedAt: data.pacoteFotoUploadedAt,
      etiquetaFotoUrl: data.etiquetaFotoUrl,
      etiquetaFotoId: data.etiquetaFotoId,
      etiquetaFotoUploadedAt: data.etiquetaFotoUploadedAt,
      palletFotoUrl: data.palletFotoUrl,
      palletFotoId: data.palletFotoId,
      palletFotoUploadedAt: data.palletFotoUploadedAt,
    }),
    [congelado],
  );

  const uploadPendingPhotos = useCallback(
    async (targetRowId: number) => {
      const hasPhotos = Object.values(photoFiles).some((file) => file !== null);
      if (!hasPhotos) return;

      setPhotoLoading(true);
      const uploadPromises: Promise<Response>[] = [];
      const photoTypes: string[] = [];

      for (const [photoType, photoFile] of Object.entries(photoFiles)) {
        if (!photoFile) continue;
        const formDataPhoto = new FormData();
        formDataPhoto.append('photo', photoFile);
        formDataPhoto.append('rowId', targetRowId.toString());
        formDataPhoto.append('photoType', photoType);
        uploadPromises.push(
          fetch('/api/upload/photo', { method: 'POST', body: formDataPhoto }),
        );
        photoTypes.push(photoType);
      }

      const uploadResults = await Promise.all(uploadPromises);
      const fotos: Record<string, string | undefined> = {};
      const now = new Date().toISOString();

      for (let i = 0; i < uploadResults.length; i++) {
        const uploadRes = uploadResults[i];
        const photoType = photoTypes[i];
        if (!uploadRes.ok) {
          if (uploadRes.status === 413) {
            throw new Error(
              `Foto ${photoType} muito grande. Tente reduzir o tamanho ou qualidade da imagem (máx. 4MB)`,
            );
          }
          throw new Error(`Erro ao fazer upload da foto ${photoType}. Status: ${uploadRes.status}`);
        }
        const uploadData = await uploadRes.json();
        const prefix =
          photoType === 'pacote' ? 'pacote' : photoType === 'etiqueta' ? 'etiqueta' : 'pallet';
        fotos[`${prefix}FotoUrl`] = uploadData.photoUrl;
        fotos[`${prefix}FotoId`] = uploadData.photoId;
        fotos[`${prefix}FotoUploadedAt`] = now;
      }

      if (Object.keys(fotos).length > 0) {
        const syncRes = await fetch(
          `/api/producao/embalagem/planilha/${targetRowId}/fotos`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fotos),
          },
        );
        if (!syncRes.ok) {
          const syncData = await syncRes.json().catch(() => ({}));
          throw new Error(syncData.error || 'Erro ao sincronizar fotos no banco');
        }
      }

      setPhotoLoading(false);
    },
    [photoFiles],
  );

  const executeSaveNovoLote = useCallback(async () => {
    if (!pedidoEmbalagemId) return;

    if (totalQtyVisivel(formData) <= 0) {
      setMessage({
        type: 'error',
        text: 'Informe ao menos uma quantidade maior que zero (cx, pct, un ou kg).',
      });
      return;
    }

    const payload = sanitizeQuantidades(formData);

    try {
      setIsSubmitting(true);
      setMessage(null);

      const res = await fetch(
        `/api/producao/embalagem/pedido/${pedidoEmbalagemId}/lote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildLotePayload(payload)),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar lote');

      const planilhaRowId = data.planilhaRowId ?? data.novaLinhaRowId;
      if (planilhaRowId) {
        await uploadPendingPhotos(Number(planilhaRowId));
      }

      if (onSaveSuccess) await onSaveSuccess();
      setFormData({ caixas: 0, pacotes: 0, unidades: 0, kg: 0, obsEmbalagem: '' });
      setPhotoFiles({ pacote: null, etiqueta: null, pallet: null });
      setMessage(null);
      onClose();
    } catch (error) {
      setPhotoLoading(false);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao salvar novo lote',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    pedidoEmbalagemId,
    formData,
    buildLotePayload,
    uploadPendingPhotos,
    onSaveSuccess,
    totalQtyVisivel,
    sanitizeQuantidades,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiplos cliques
    if (isSubmitting) return;
    
    // Validação de fotos obrigatórias - APENAS para modo embalagem
    if (mode === 'embalagem') {
      const validator = new PhotoValidator(formData, photoFiles, cliente);
      const validationResult = validator.validate();
      
      // Se faltam fotos, mostrar modal de confirmação
      if (!validationResult.isValid && validationResult.errorMessage) {
        setConfirmModalMessage(validationResult.errorMessage);
        setShowConfirmModal(true);
        setPendingAction('submit');
        return;
      }
    }
    
    // Executar o submit
    await executeSubmit();
  };

  const executeSubmit = async () => {
    if (isNewLote && pedidoEmbalagemId && mode === 'embalagem') {
      await executeSaveNovoLote();
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);
      
      let updatedFormData = { ...formData };
      
      // Verificar se há fotos para upload
      const hasPhotos = mode === 'forno' || mode === 'fermentacao' || mode === 'resfriamento' ? Boolean(photoFiles.pacote) : Object.values(photoFiles).some(file => file !== null);
      
      // Upload de fotos se houver
      if (rowId && hasPhotos) {
        setPhotoLoading(true);
        
        // Fazer upload de todas as fotos primeiro
        const uploadPromises = [];
        const photoTypes = [];
        
        for (const [photoType, photoFile] of Object.entries(photoFiles)) {
          if (photoFile) {
            const formDataPhoto = new FormData();
            formDataPhoto.append('photo', photoFile);
            formDataPhoto.append('rowId', rowId.toString());
            formDataPhoto.append('photoType', mode === 'forno' ? 'forno' : mode === 'fermentacao' ? 'fermentacao' : mode === 'resfriamento' ? 'resfriamento' : photoType);
            if (mode === 'forno') formDataPhoto.append('process', 'forno');
            if (mode === 'fermentacao') formDataPhoto.append('process', 'fermentacao');
            if (mode === 'resfriamento') formDataPhoto.append('process', 'resfriamento');
            
            uploadPromises.push(
              fetch('/api/upload/photo', {
                method: 'POST',
                body: formDataPhoto,
              })
            );
            photoTypes.push(photoType);
          }
        }
        
        // Aguardar todos os uploads
        const uploadResults = await Promise.all(uploadPromises);
        
        // Verificar se todos os uploads foram bem-sucedidos
        for (let i = 0; i < uploadResults.length; i++) {
          const uploadRes = uploadResults[i];
          const photoType = photoTypes[i];
          
          if (!uploadRes.ok) {
            // Tentar parsear como JSON, mas se falhar, usar mensagem genérica
            try {
              const uploadData = await uploadRes.json();
              throw new Error(uploadData.error || `Erro ao fazer upload da foto ${photoType}`);
            } catch {
              // Se não conseguir parsear JSON, é provavelmente erro 413 ou similar
              if (uploadRes.status === 413) {
                throw new Error(`Foto ${photoType} muito grande. Tente reduzir o tamanho ou qualidade da imagem (máx. 4MB)`);
              }
              throw new Error(`Erro ao fazer upload da foto ${photoType}. Status: ${uploadRes.status}`);
            }
          }
          
          const uploadData = await uploadRes.json();
          
          // Atualizar formData com dados da foto baseado no tipo
          const photoFieldPrefix = mode === 'forno' ? 'forno' : mode === 'fermentacao' ? 'fermentacao' : mode === 'resfriamento' ? 'resfriamento' : (photoType === 'pacote' ? 'pacote' : photoType === 'etiqueta' ? 'etiqueta' : 'pallet');
          
          updatedFormData = {
            ...updatedFormData,
            [`${photoFieldPrefix}FotoUrl`]: uploadData.photoUrl,
            [`${photoFieldPrefix}FotoId`]: uploadData.photoId,
            [`${photoFieldPrefix}FotoUploadedAt`]: new Date().toISOString(),
          };
        }
        
        setPhotoLoading(false);
      }
      
      await onSave(sanitizeQuantidades(updatedFormData));
      
      // Recarregar dados do painel se callback fornecido
      if (onSaveSuccess) {
        await onSaveSuccess();
      }
      
      resetAndClose();
    } catch (error) {
      setPhotoLoading(false);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao salvar produção' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoSelect = (file: File, photoType: 'pacote' | 'etiqueta' | 'pallet') => {
    setPhotoFiles(prev => ({
      ...prev,
      [photoType]: file
    }));
  };

  const handlePhotoRemove = (photoType: 'pacote' | 'etiqueta' | 'pallet') => {
    setPhotoFiles(prev => ({
      ...prev,
      [photoType]: null
    }));
  };

  const handlePhotoManagerRemove = async (photoType: 'pacote' | 'etiqueta' | 'pallet') => {
    if (!rowId) return;
    
    try {
      setPhotoLoading(true);
      const typeParam = mode === 'forno' ? 'forno' : mode === 'fermentacao' ? 'fermentacao' : mode === 'resfriamento' ? 'resfriamento' : photoType;
      const processParam = mode === 'forno' ? '&process=forno' : mode === 'fermentacao' ? '&process=fermentacao' : mode === 'resfriamento' ? '&process=resfriamento' : '';
      const res = await fetch(`/api/photo/${rowId}?type=${typeParam}${processParam}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Erro ao remover foto ${photoType}`);
      }
      
      // Atualizar formData para remover dados da foto
      const photoFieldPrefix = mode === 'forno' ? 'forno' : mode === 'fermentacao' ? 'fermentacao' : mode === 'resfriamento' ? 'resfriamento' : (photoType === 'pacote' ? 'pacote' : photoType === 'etiqueta' ? 'etiqueta' : 'pallet');
      
      setFormData(prev => ({
        ...prev,
        [`${photoFieldPrefix}FotoUrl`]: undefined,
        [`${photoFieldPrefix}FotoId`]: undefined,
        [`${photoFieldPrefix}FotoUploadedAt`]: undefined,
      }));
      
      setMessage({ type: 'success', text: `Foto ${photoType} removida com sucesso!` });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : `Erro ao remover foto ${photoType}` 
      });
    } finally {
      setPhotoLoading(false);
    }
  };

  // Verificar se é produção parcial (produção < pedido) - APENAS para modo embalagem
  const isPartialProduction = (): boolean => {
    if (mode !== 'embalagem' || !pedidoQuantidades) return false;

    return (
      (camposVisiveis.caixas &&
        pedidoQuantidades.caixas > 0 &&
        formData.caixas < pedidoQuantidades.caixas) ||
      (camposVisiveis.pacotes &&
        pedidoQuantidades.pacotes > 0 &&
        formData.pacotes < pedidoQuantidades.pacotes) ||
      (camposVisiveis.unidades &&
        pedidoQuantidades.unidades > 0 &&
        formData.unidades < pedidoQuantidades.unidades) ||
      (camposVisiveis.kg &&
        pedidoQuantidades.kg > 0 &&
        formData.kg < pedidoQuantidades.kg)
    );
  };

  // Handler para salvar produção parcial - APENAS para modo embalagem
  const handleSavePartial = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevenir múltiplos cliques
    if (isSubmitting || mode !== 'embalagem') return;

    if (isNewLote && pedidoEmbalagemId) {
      const validator = new PhotoValidator(formData, photoFiles, cliente);
      const validationResult = validator.validate();
      if (!validationResult.isValid && validationResult.errorMessage) {
        setConfirmModalMessage(validationResult.errorMessage);
        setShowConfirmModal(true);
        setPendingAction('partial');
        return;
      }
      await executeSaveNovoLote();
      return;
    }

    if (!rowId) return;

    // Validação de fotos obrigatórias
    const validator = new PhotoValidator(formData, photoFiles, cliente);
    const validationResult = validator.validate();
    
    // Se faltam fotos, mostrar modal de confirmação
    if (!validationResult.isValid && validationResult.errorMessage) {
      setConfirmModalMessage(validationResult.errorMessage);
      setShowConfirmModal(true);
      setPendingAction('partial');
      return;
    }

    // Executar o salvamento parcial
    await executeSavePartial();
  };

  const executeSavePartial = async () => {
    if (isNewLote && pedidoEmbalagemId) {
      await executeSaveNovoLote();
      return;
    }

    if (!rowId) return;

    if (totalQtyVisivel(formData) <= 0) {
      setMessage({
        type: 'error',
        text: 'Informe ao menos uma quantidade maior que zero (cx, pct, un ou kg).',
      });
      return;
    }

    const payload = sanitizeQuantidades(formData);
    
    try {
      setIsSubmitting(true);
      setMessage(null);

      // 1. Chamar API de salvar parcial PRIMEIRO (sem fazer upload de fotos)
      const res = await fetch(`/api/producao/embalagem/${rowId}/partial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caixas: payload.caixas,
          pacotes: payload.pacotes,
          unidades: payload.unidades,
          kg: payload.kg,
          // Incluir dados de fotos JÁ EXISTENTES (não novas)
          pacoteFotoUrl: formData.pacoteFotoUrl,
          pacoteFotoId: formData.pacoteFotoId,
          pacoteFotoUploadedAt: formData.pacoteFotoUploadedAt,
          etiquetaFotoUrl: formData.etiquetaFotoUrl,
          etiquetaFotoId: formData.etiquetaFotoId,
          etiquetaFotoUploadedAt: formData.etiquetaFotoUploadedAt,
          palletFotoUrl: formData.palletFotoUrl,
          palletFotoId: formData.palletFotoId,
          palletFotoUploadedAt: formData.palletFotoUploadedAt,
          obsEmbalagem: formData.obsEmbalagem || '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar produção parcial');
      }

      // 2. Se houver fotos novas para upload, fazer upload para a NOVA LINHA
      const hasPhotos = Object.values(photoFiles).some(file => file !== null);
      const novaLinhaRowId = data.novaLinhaRowId;

      if (hasPhotos && novaLinhaRowId) {
        setPhotoLoading(true);

        // Fazer upload de todas as fotos para a NOVA linha
        const uploadPromises = [];
        const photoTypes = [];

        for (const [photoType, photoFile] of Object.entries(photoFiles)) {
          if (photoFile) {
            const formDataPhoto = new FormData();
            formDataPhoto.append('photo', photoFile);
            formDataPhoto.append('rowId', novaLinhaRowId.toString()); // Usar rowId da NOVA linha
            formDataPhoto.append('photoType', photoType);

            uploadPromises.push(
              fetch('/api/upload/photo', {
                method: 'POST',
                body: formDataPhoto,
              })
            );
            photoTypes.push(photoType);
          }
        }

        // Aguardar todos os uploads
        const uploadResults = await Promise.all(uploadPromises);

        // Verificar se todos os uploads foram bem-sucedidos
        for (let i = 0; i < uploadResults.length; i++) {
          const uploadRes = uploadResults[i];
          const photoType = photoTypes[i];

          if (!uploadRes.ok) {
            try {
              const uploadData = await uploadRes.json();
              throw new Error(uploadData.error || `Erro ao fazer upload da foto ${photoType}`);
            } catch {
              if (uploadRes.status === 413) {
                throw new Error(`Foto ${photoType} muito grande. Tente reduzir o tamanho ou qualidade da imagem (máx. 4MB)`);
              }
              throw new Error(`Erro ao fazer upload da foto ${photoType}. Status: ${uploadRes.status}`);
            }
          }
        }

        setPhotoLoading(false);
      }

      // 3. Recarregar dados do painel se callback fornecido
      if (onSaveSuccess) {
        await onSaveSuccess();
      }

      resetAndClose();
    } catch (error) {
      setPhotoLoading(false);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao salvar produção parcial' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleConfirmAction = async () => {
    setShowConfirmModal(false);
    
    if (pendingAction === 'submit') {
      await executeSubmit();
    } else if (pendingAction === 'partial') {
      await executeSavePartial();
    }
    
    setPendingAction(null);
  };

  const handleCancelConfirmation = () => {
    setShowConfirmModal(false);
    setPendingAction(null);
    setConfirmModalMessage('');
  };

  const resetAndClose = () => {
    setFormData({
      caixas: 0,
      pacotes: 0,
      unidades: 0,
      kg: 0,
      obsEmbalagem: '',
    });
    setMessage(null);
    setPhotoFiles({
      pacote: null,
      etiqueta: null,
      pallet: null,
    });
    setShowConfirmModal(false);
    setPendingAction(null);
    setConfirmModalMessage('');
    onClose();
  };

  const hasDraftChanges = useCallback(() => {
    const hasQty =
      (formData.caixas || 0) +
        (formData.pacotes || 0) +
        (formData.unidades || 0) +
        (formData.kg || 0) >
      0;
    const hasObs = Boolean((formData.obsEmbalagem || '').trim());
    const hasNewPhotos = Object.values(photoFiles).some((file) => file !== null);
    return hasQty || hasObs || hasNewPhotos;
  }, [formData, photoFiles]);

  const requestClose = useCallback(() => {
    if (isSubmitting || photoLoading || loading) return;
    if (hasDraftChanges()) {
      const confirmed = window.confirm(
        'Descartar o que foi preenchido neste lote?',
      );
      if (!confirmed) return;
    }
    resetAndClose();
  }, [hasDraftChanges, isSubmitting, photoLoading, loading]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showConfirmModal) {
        requestClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, showConfirmModal, requestClose]);

  if (!isOpen) return null;

  const modalTitle = isNewLote ? 'Novo lote' : 'Editar produção';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="producao-modal-title"
    >
      {/* Scrim leve: fundo já é gray-900 — overlay escuro demais “apaga” os cards */}
      <button
        type="button"
        className="absolute inset-0 bg-black/25 backdrop-blur-[1px] cursor-default motion-reduce:backdrop-blur-none"
        aria-label="Fechar modal"
        onClick={requestClose}
        disabled={isSubmitting || photoLoading || loading}
      />

      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto motion-reduce:transition-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6 gap-3">
            <h2 id="producao-modal-title" className="text-xl sm:text-2xl font-bold text-gray-900">
              {modalTitle}
            </h2>
            <button
              type="button"
              onClick={requestClose}
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Fechar"
              disabled={isSubmitting || photoLoading || loading}
            >
              <span className="material-icons text-2xl" aria-hidden>
                close
              </span>
            </button>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              <div className="whitespace-pre-line">{message.text}</div>
            </div>
          )}

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <div className="mb-2"><strong>Cliente:</strong> {cliente}</div>
              <div className="mb-2"><strong>Produto:</strong> {produto}</div>
              {pedidoQuantidades && (
                <div>
                  <strong>Pedido:</strong>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {pedidoQuantidades.caixas > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                        {pedidoQuantidades.caixas} {mode === 'forno' || mode === 'fermentacao' || mode === 'resfriamento' ? 'Latas' : 'Caixas'}
                      </span>
                    )}
                    {pedidoQuantidades.pacotes > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium">
                        {pedidoQuantidades.pacotes} Pacotes
                      </span>
                    )}
                    {pedidoQuantidades.unidades > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 text-xs font-medium">
                        {pedidoQuantidades.unidades} Unidades
                      </span>
                    )}
                    {pedidoQuantidades.kg > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-medium">
                        {pedidoQuantidades.kg} Kg
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {(mode !== 'embalagem' || camposVisiveis.caixas) && (
                <NumberInput
                  label={mode === 'forno' || mode === 'fermentacao' || mode === 'resfriamento' ? 'Latas' : 'Caixas'}
                  value={formData.caixas}
                  onChange={(value) => setFormData(prev => ({ ...prev, caixas: value }))}
                  min={0}
                  step={1}
                />
              )}
              
              {mode !== 'forno' && mode !== 'fermentacao' && mode !== 'resfriamento' && (mode !== 'embalagem' || camposVisiveis.pacotes) && (
                <NumberInput
                  label="Pacotes"
                  value={formData.pacotes}
                  onChange={(value) => setFormData(prev => ({ ...prev, pacotes: value }))}
                  min={0}
                  step={1}
                />
              )}
              
              {(mode !== 'embalagem' || camposVisiveis.unidades) && (
                <NumberInput
                  label="Unidades"
                  value={formData.unidades}
                  onChange={(value) => setFormData(prev => ({ ...prev, unidades: value }))}
                  min={0}
                  step={1}
                />
              )}
              
              {(mode !== 'embalagem' || camposVisiveis.kg) && (
                <NumberInput
                  label="Kg"
                  value={formData.kg}
                  onChange={(value) => setFormData(prev => ({ ...prev, kg: value }))}
                  min={0}
                  step={1}
                />
              )}
            </div>

            {/* Campo de Observação - APENAS para modo embalagem */}
            {mode === 'embalagem' && (
              <div className="border-t pt-6">
                <label className="block text-base font-semibold text-gray-800 mb-3">
                  Observação de Embalagem
                </label>
                <textarea
                  value={formData.obsEmbalagem || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, obsEmbalagem: e.target.value }))}
                  placeholder="Digite observações sobre a embalagem..."
                  disabled={loading || isSubmitting}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-medium bg-white text-gray-900 placeholder-gray-500 resize-y"
                />
              </div>
            )}

            {/* Seção de Fotos */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Fotos da Produção</h3>
              
              <div className="space-y-6">
                {/* Foto principal: Pacote (ou Forno/Fermentacao/Resfriamento) */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">
                    {mode === 'forno' ? '🔥 Foto do Forno' : mode === 'fermentacao' ? '🥖 Foto da Fermentação' : mode === 'resfriamento' ? '❄️ Foto do Resfriamento' : '📦 Foto do Pacote'}
                  </h4>
                  
                  {/* Mostrar botão "Ver Foto" se houver foto */}
                  {(mode === 'forno' ? formData.fornoFotoUrl : mode === 'fermentacao' ? formData.fermentacaoFotoUrl : mode === 'resfriamento' ? formData.resfriamentoFotoUrl : formData.pacoteFotoUrl) && (
                    <div className="mb-4">
                      <PhotoManager
                        photoUrl={(mode === 'forno' ? formData.fornoFotoUrl : mode === 'fermentacao' ? formData.fermentacaoFotoUrl : mode === 'resfriamento' ? formData.resfriamentoFotoUrl : formData.pacoteFotoUrl) || ''}
                        photoId={(mode === 'forno' ? formData.fornoFotoId : mode === 'fermentacao' ? formData.fermentacaoFotoId : mode === 'resfriamento' ? formData.resfriamentoFotoId : formData.pacoteFotoId) || ''}
                        onPhotoRemove={() => handlePhotoManagerRemove('pacote')}
                        loading={photoLoading}
                        disabled={loading}
                        showRemoveButton={true}
                      />
                    </div>
                  )}
                  
                  {/* Input de upload sempre disponível */}
                  <PhotoUploader
                    onPhotoSelect={(file) => handlePhotoSelect(file, 'pacote')}
                    onPhotoRemove={() => handlePhotoRemove('pacote')}
                    loading={photoLoading}
                    disabled={loading}
                    currentPhotoUrl={(mode === 'forno' ? formData.fornoFotoUrl : mode === 'fermentacao' ? formData.fermentacaoFotoUrl : mode === 'resfriamento' ? formData.resfriamentoFotoUrl : formData.pacoteFotoUrl)}
                  />
                </div>
                {mode !== 'forno' && mode !== 'fermentacao' && mode !== 'resfriamento' && (
                  <>
                    {/* Foto da Etiqueta */}
                    <div>
                      <h4 className="text-md font-medium text-gray-700 mb-3">🏷️ Foto da Etiqueta</h4>
                      {formData.etiquetaFotoUrl && (
                        <div className="mb-4">
                          <PhotoManager
                            photoUrl={formData.etiquetaFotoUrl}
                            photoId={formData.etiquetaFotoId}
                            onPhotoRemove={() => handlePhotoManagerRemove('etiqueta')}
                            loading={photoLoading}
                            disabled={loading}
                            showRemoveButton={true}
                          />
                        </div>
                      )}
                      <PhotoUploader
                        onPhotoSelect={(file) => handlePhotoSelect(file, 'etiqueta')}
                        onPhotoRemove={() => handlePhotoRemove('etiqueta')}
                        loading={photoLoading}
                        disabled={loading}
                        currentPhotoUrl={formData.etiquetaFotoUrl}
                      />
                    </div>

                    {/* Foto do Pallet */}
                    <div>
                      <h4 className="text-md font-medium text-gray-700 mb-3">🚛 Foto do Pallet</h4>
                      {formData.palletFotoUrl && (
                        <div className="mb-4">
                          <PhotoManager
                            photoUrl={formData.palletFotoUrl}
                            photoId={formData.palletFotoId}
                            onPhotoRemove={() => handlePhotoManagerRemove('pallet')}
                            loading={photoLoading}
                            disabled={loading}
                            showRemoveButton={true}
                          />
                        </div>
                      )}
                      <PhotoUploader
                        onPhotoSelect={(file) => handlePhotoSelect(file, 'pallet')}
                        onPhotoRemove={() => handlePhotoRemove('pallet')}
                        loading={photoLoading}
                        disabled={loading}
                        currentPhotoUrl={formData.palletFotoUrl}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={requestClose}
                className="px-6 py-3 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors font-medium min-h-11"
                disabled={loading || isSubmitting}
              >
                Cancelar
              </button>
              
              {/* Botão Salvar Parcial - APENAS para modo embalagem */}
              {mode === 'embalagem' && (
                <button
                  type="button"
                  onClick={handleSavePartial}
                  className="px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 font-medium flex items-center justify-center min-w-[140px]"
                  disabled={loading || isSubmitting || !isPartialProduction()}
                  title={!isPartialProduction() ? 'Disponível apenas quando produção é menor que o pedido' : 'Salvar produção parcial e criar novo pedido com a diferença'}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {photoLoading ? 'Enviando fotos...' : 'Salvando...'}
                    </>
                  ) : (
                    'Salvar Parcial'
                  )}
                </button>
              )}

              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium flex items-center justify-center min-w-[140px]"
                disabled={loading || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {photoLoading ? 'Enviando fotos...' : 'Salvando...'}
                  </>
                ) : (
                  'Salvar Produção'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Confirmação de Fotos Faltantes */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-[1px]"
          role="alertdialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Atenção: Fotos Incompletas
                  </h3>
                  <div className="text-sm text-gray-600 whitespace-pre-line">
                    {confirmModalMessage}
                  </div>
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800 font-medium">
                      Deseja continuar mesmo assim?
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelConfirmation}
                  className="px-5 py-2.5 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  Voltar e Adicionar Fotos
                </button>
                <button
                  onClick={handleConfirmAction}
                  className="px-5 py-2.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors font-medium"
                >
                  Continuar Sem Fotos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
