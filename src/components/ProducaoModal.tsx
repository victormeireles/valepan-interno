'use client';

import { useState, useEffect } from 'react';
import NumberInput from './FormControls/NumberInput';
import PhotoUploader from './PhotoUploader';
import PhotoManager from './PhotoManager';
import { ProducaoData } from '@/domain/types';


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
  pedidoQuantidades?: {
    caixas: number;
    pacotes: number;
    unidades: number;
    kg: number;
  };
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
  pedidoQuantidades
}: ProducaoModalProps) {
  const [formData, setFormData] = useState<ProducaoData>({
    caixas: 0,
    pacotes: 0,
    unidades: 0,
    kg: 0,
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

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiplos cliques
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      setMessage(null);
      
      let updatedFormData = { ...formData };
      
      // Verificar se há fotos para upload
      const hasPhotos = Object.values(photoFiles).some(file => file !== null);
      
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
            // Tentar parsear como JSON, mas se falhar, usar mensagem genérica
            try {
              const uploadData = await uploadRes.json();
              throw new Error(uploadData.error || `Erro ao fazer upload da foto ${photoType}`);
            } catch (jsonError) {
              // Se não conseguir parsear JSON, é provavelmente erro 413 ou similar
              if (uploadRes.status === 413) {
                throw new Error(`Foto ${photoType} muito grande. Tente reduzir o tamanho ou qualidade da imagem (máx. 4MB)`);
              }
              throw new Error(`Erro ao fazer upload da foto ${photoType}. Status: ${uploadRes.status}`);
            }
          }
          
          const uploadData = await uploadRes.json();
          
          // Atualizar formData com dados da foto baseado no tipo
          const photoFieldPrefix = photoType === 'pacote' ? 'pacote' : 
                                 photoType === 'etiqueta' ? 'etiqueta' : 'pallet';
          
          updatedFormData = {
            ...updatedFormData,
            [`${photoFieldPrefix}FotoUrl`]: uploadData.photoUrl,
            [`${photoFieldPrefix}FotoId`]: uploadData.photoId,
            [`${photoFieldPrefix}FotoUploadedAt`]: new Date().toISOString(),
          };
        }
        
        setPhotoLoading(false);
      }
      
      await onSave(updatedFormData);
      
      // Recarregar dados do painel se callback fornecido
      if (onSaveSuccess) {
        await onSaveSuccess();
      }
      
      // Fechar modal imediatamente após salvar com sucesso
      onClose();
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
      const res = await fetch(`/api/photo/${rowId}?type=${photoType}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Erro ao remover foto ${photoType}`);
      }
      
      // Atualizar formData para remover dados da foto
      const photoFieldPrefix = photoType === 'pacote' ? 'pacote' : 
                             photoType === 'etiqueta' ? 'etiqueta' : 'pallet';
      
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

  // Verificar se é produção parcial (produção < pedido)
  const isPartialProduction = (): boolean => {
    if (!pedidoQuantidades) return false;
    
    return (
      (pedidoQuantidades.caixas > 0 && formData.caixas < pedidoQuantidades.caixas) ||
      (pedidoQuantidades.pacotes > 0 && formData.pacotes < pedidoQuantidades.pacotes) ||
      (pedidoQuantidades.unidades > 0 && formData.unidades < pedidoQuantidades.unidades) ||
      (pedidoQuantidades.kg > 0 && formData.kg < pedidoQuantidades.kg)
    );
  };

  // Handler para salvar produção parcial
  const handleSavePartial = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiplos cliques
    if (isSubmitting || !rowId) return;
    
    try {
      setIsSubmitting(true);
      setMessage(null);
      
      // 1. Chamar API de salvar parcial PRIMEIRO (sem fazer upload de fotos)
      const res = await fetch(`/api/producao/embalagem/${rowId}/partial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caixas: formData.caixas,
          pacotes: formData.pacotes,
          unidades: formData.unidades,
          kg: formData.kg,
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
            } catch (jsonError) {
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
      
      // Fechar modal imediatamente após salvar com sucesso
      onClose();
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

  const handleClose = () => {
    setFormData({
      caixas: 0,
      pacotes: 0,
      unidades: 0,
      kg: 0,
    });
    setMessage(null);
    setPhotoFiles({
      pacote: null,
      etiqueta: null,
      pallet: null,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Editar Produção
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {message.text}
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
                        {pedidoQuantidades.caixas} Caixas
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
                label="Caixas"
                value={formData.caixas}
                onChange={(value) => setFormData(prev => ({ ...prev, caixas: value }))}
                min={0}
                step={1}
              />
              
              <NumberInput
                label="Pacotes"
                value={formData.pacotes}
                onChange={(value) => setFormData(prev => ({ ...prev, pacotes: value }))}
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
                {/* Foto do Pacote */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">📦 Foto do Pacote</h4>
                  
                  {/* Mostrar botão "Ver Foto" se houver foto */}
                  {formData.pacoteFotoUrl && (
                    <div className="mb-4">
                      <PhotoManager
                        photoUrl={formData.pacoteFotoUrl}
                        photoId={formData.pacoteFotoId}
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
                    currentPhotoUrl={formData.pacoteFotoUrl}
                  />
                </div>

                {/* Foto da Etiqueta */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">🏷️ Foto da Etiqueta</h4>
                  
                  {/* Mostrar botão "Ver Foto" se houver foto */}
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
                  
                  {/* Input de upload sempre disponível */}
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
                  
                  {/* Mostrar botão "Ver Foto" se houver foto */}
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
                  
                  {/* Input de upload sempre disponível */}
                  <PhotoUploader
                    onPhotoSelect={(file) => handlePhotoSelect(file, 'pallet')}
                    onPhotoRemove={() => handlePhotoRemove('pallet')}
                    loading={photoLoading}
                    disabled={loading}
                    currentPhotoUrl={formData.palletFotoUrl}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors font-medium"
                disabled={loading || isSubmitting}
              >
                Cancelar
              </button>
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
    </div>
  );
}
