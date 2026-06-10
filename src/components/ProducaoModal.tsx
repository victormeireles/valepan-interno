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
import { EmbalagemLoteModalShell } from './EmbalagemLoteModal';


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
  loteId?: string;
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
  loteId,
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
  const [showPhotoWarning, setShowPhotoWarning] = useState(false);
  const [photoWarningMessage, setPhotoWarningMessage] = useState('');
  const [showDiscardSheet, setShowDiscardSheet] = useState(false);
  const [removeConfirmSlot, setRemoveConfirmSlot] = useState<
    'pacote' | 'etiqueta' | 'pallet' | null
  >(null);
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
    if (!rowId && !loteId) return;
    setFormData(initialData);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `initialData` omitido: o pai recria o objeto a cada render
  }, [isOpen, rowId, loteId, isNewLote, pedidoEmbalagemId]);

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
    async (target: { rowId?: number; loteId?: string }) => {
      const hasPhotos = Object.values(photoFiles).some((file) => file !== null);
      if (!hasPhotos) return;

      setPhotoLoading(true);
      const uploadPromises: Promise<Response>[] = [];
      const photoTypes: string[] = [];

      for (const [photoType, photoFile] of Object.entries(photoFiles)) {
        if (!photoFile) continue;
        const formDataPhoto = new FormData();
        formDataPhoto.append('photo', photoFile);
        formDataPhoto.append('photoType', photoType);
        if (target.loteId) {
          formDataPhoto.append('loteId', target.loteId);
        } else if (target.rowId) {
          formDataPhoto.append('rowId', target.rowId.toString());
        }
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

      if (Object.keys(fotos).length > 0 && target.loteId) {
        const syncRes = await fetch(`/api/producao/embalagem/lote/${target.loteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fotos),
        });
        if (!syncRes.ok) {
          const syncData = await syncRes.json().catch(() => ({}));
          throw new Error(syncData.error || 'Erro ao sincronizar fotos no banco');
        }
      } else if (Object.keys(fotos).length > 0 && target.rowId) {
        const syncRes = await fetch(
          `/api/producao/embalagem/planilha/${target.rowId}/fotos`,
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

      const createdLoteId = data.loteId as string | undefined;
      if (createdLoteId) {
        await uploadPendingPhotos({ loteId: createdLoteId });
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
    onClose,
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
        setPhotoWarningMessage(validationResult.errorMessage);
        setShowPhotoWarning(true);
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
      if ((rowId || loteId) && hasPhotos) {
        setPhotoLoading(true);
        
        // Fazer upload de todas as fotos primeiro
        const uploadPromises = [];
        const photoTypes = [];
        
        for (const [photoType, photoFile] of Object.entries(photoFiles)) {
          if (photoFile) {
            const formDataPhoto = new FormData();
            formDataPhoto.append('photo', photoFile);
            if (loteId) {
              formDataPhoto.append('loteId', loteId);
            } else if (rowId) {
              formDataPhoto.append('rowId', rowId.toString());
            }
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
    if (!rowId && !loteId) return;
    
    try {
      setPhotoLoading(true);
      if (loteId && mode === 'embalagem') {
        const photoFieldPrefix =
          photoType === 'pacote' ? 'pacote' : photoType === 'etiqueta' ? 'etiqueta' : 'pallet';
        setFormData((prev) => ({
          ...prev,
          [`${photoFieldPrefix}FotoUrl`]: undefined,
          [`${photoFieldPrefix}FotoId`]: undefined,
          [`${photoFieldPrefix}FotoUploadedAt`]: undefined,
        }));
        setMessage({ type: 'success', text: `Foto ${photoType} removida. Salve para confirmar.` });
        return;
      }

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
        setPhotoWarningMessage(validationResult.errorMessage);
        setShowPhotoWarning(true);
        setPendingAction('partial');
        return;
      }
      await executeSaveNovoLote();
      return;
    }

    if (!rowId && !pedidoEmbalagemId) return;

    // Validação de fotos obrigatórias
    const validator = new PhotoValidator(formData, photoFiles, cliente);
    const validationResult = validator.validate();
    
    // Se faltam fotos, mostrar modal de confirmação
    if (!validationResult.isValid && validationResult.errorMessage) {
      setPhotoWarningMessage(validationResult.errorMessage);
      setShowPhotoWarning(true);
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

    if (!rowId && !loteId) return;

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

      if (pedidoEmbalagemId) {
        const res = await fetch(
          `/api/producao/embalagem/pedido/${pedidoEmbalagemId}/lote`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildLotePayload(payload)),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar produção parcial');

        const createdLoteId = data.loteId as string | undefined;
        if (createdLoteId) {
          await uploadPendingPhotos({ loteId: createdLoteId });
        }
      } else {
        throw new Error('Pedido de embalagem não informado para salvar parcial');
      }

      if (onSaveSuccess) await onSaveSuccess();
      resetAndClose();
    } catch (error) {
      setPhotoLoading(false);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao salvar produção parcial',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handlePhotoWarningContinue = async () => {
    setShowPhotoWarning(false);
    if (pendingAction === 'submit') {
      await executeSubmit();
    } else if (pendingAction === 'partial') {
      await executeSavePartial();
    }
    setPendingAction(null);
    setPhotoWarningMessage('');
  };

  const handlePhotoWarningBack = () => {
    setShowPhotoWarning(false);
    setPendingAction(null);
    setPhotoWarningMessage('');
  };

  const handleDiscardConfirm = () => {
    setShowDiscardSheet(false);
    resetAndClose();
  };

  const handleDiscardCancel = () => {
    setShowDiscardSheet(false);
  };

  const handleRemovePhotoConfirm = async () => {
    const slot = removeConfirmSlot;
    if (!slot) return;
    setRemoveConfirmSlot(null);
    await handlePhotoManagerRemove(slot);
  };

  const handleRemovePhotoCancel = () => {
    setRemoveConfirmSlot(null);
  };

  const resetAndClose = useCallback(() => {
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
    setShowPhotoWarning(false);
    setShowDiscardSheet(false);
    setRemoveConfirmSlot(null);
    setPendingAction(null);
    setPhotoWarningMessage('');
    onClose();
  }, [onClose]);

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
      setShowDiscardSheet(true);
      return;
    }
    resetAndClose();
  }, [hasDraftChanges, isSubmitting, photoLoading, loading, resetAndClose]);

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
      if (
        e.key === 'Escape' &&
        !showPhotoWarning &&
        !showDiscardSheet &&
        !removeConfirmSlot
      ) {
        requestClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, showPhotoWarning, showDiscardSheet, removeConfirmSlot, requestClose]);

  if (!isOpen) return null;

  const embalagemTitle = isNewLote ? 'Novo lote' : 'Editar lote';
  const modalTitle = isNewLote ? 'Novo lote' : 'Editar produção';

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center ${
        mode === 'embalagem'
          ? 'items-end p-0 pt-3 sm:items-center sm:p-4'
          : 'items-end sm:items-center p-3 sm:p-4'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="producao-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/25 backdrop-blur-[1px] cursor-default motion-reduce:backdrop-blur-none"
        aria-label="Fechar modal"
        onClick={requestClose}
        disabled={isSubmitting || photoLoading || loading}
      />

      {mode === 'embalagem' ? (
        <EmbalagemLoteModalShell
          isNewLote={isNewLote}
          title={embalagemTitle}
          produto={produto}
          cliente={cliente}
          congelado={congelado}
          pedidoMetaOriginal={pedidoMetaOriginal}
          pedidoQuantidades={pedidoQuantidades}
          formData={formData}
          setFormData={setFormData}
          camposVisiveis={camposVisiveis}
          photoFiles={photoFiles}
          photoLoading={photoLoading}
          loading={loading}
          isSubmitting={isSubmitting}
          message={message}
          showPhotoWarning={showPhotoWarning}
          photoWarningMessage={photoWarningMessage}
          showDiscardSheet={showDiscardSheet}
          removeConfirmSlot={removeConfirmSlot}
          showPartial={!isNewLote && isPartialProduction()}
          onRequestClose={requestClose}
          onDiscardConfirm={handleDiscardConfirm}
          onDiscardCancel={handleDiscardCancel}
          onPhotoWarningContinue={() => void handlePhotoWarningContinue()}
          onPhotoWarningBack={handlePhotoWarningBack}
          onPhotoSelect={handlePhotoSelect}
          onPhotoRemove={handlePhotoRemove}
          onPhotoManagerRemove={(type) => void handlePhotoManagerRemove(type)}
          onRemoveRequest={setRemoveConfirmSlot}
          onRemovePhotoConfirm={() => void handleRemovePhotoConfirm()}
          onRemovePhotoCancel={handleRemovePhotoCancel}
          onSubmit={handleSubmit}
          onPartial={() => {
            const e = { preventDefault: () => {} } as React.FormEvent;
            void handleSavePartial(e);
          }}
        />
      ) : (
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
              <NumberInput
                label="Latas"
                value={formData.caixas}
                onChange={(value) => setFormData(prev => ({ ...prev, caixas: value }))}
                min={0}
                step={1}
              />
              <NumberInput
                label="Unidades"
                value={formData.unidades}
                onChange={(value) => setFormData(prev => ({ ...prev, unidades: value }))}
                min={0}
                step={1}
              />
              <NumberInput
                label="Kg"
                value={formData.kg}
                onChange={(value) => setFormData(prev => ({ ...prev, kg: value }))}
                min={0}
                step={1}
              />
            </div>

            {/* Seção de Fotos */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Fotos da Produção</h3>
              
              <div className="space-y-6">
                {/* Foto principal: Pacote (ou Forno/Fermentacao/Resfriamento) */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">
                    {mode === 'forno'
                      ? 'Foto do Forno'
                      : mode === 'fermentacao'
                        ? 'Foto da Fermentação'
                        : 'Foto do Resfriamento'}
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
      )}
    </div>
  );
}
