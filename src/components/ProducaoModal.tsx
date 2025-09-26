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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMessage(null);
      
      // Se há uma nova foto para upload
      if (photoFile && rowId) {
        setPhotoLoading(true);
        
        // Se já existe uma foto, deletar a antiga primeiro
        if (formData.photoId) {
          try {
            const deleteRes = await fetch(`/api/photo/${rowId}`, {
              method: 'DELETE',
            });
            
            if (!deleteRes.ok) {
              console.warn('Erro ao deletar foto antiga, continuando com upload...');
            }
          } catch (deleteError) {
            console.warn('Erro ao deletar foto antiga:', deleteError);
          }
        }
        
        const formDataPhoto = new FormData();
        formDataPhoto.append('photo', photoFile);
        formDataPhoto.append('rowId', rowId.toString());
        
        const uploadRes = await fetch('/api/upload/photo', {
          method: 'POST',
          body: formDataPhoto,
        });
        
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json();
          throw new Error(uploadData.error || 'Erro ao fazer upload da foto');
        }
        
        const uploadData = await uploadRes.json();
        
        // Atualizar formData com dados da foto
        const updatedFormData = {
          ...formData,
          photoUrl: uploadData.photoUrl,
          photoId: uploadData.photoId,
          photoUploadedAt: new Date().toISOString(),
        };
        
        setPhotoLoading(false);
        await onSave(updatedFormData);
      } else {
        await onSave(formData);
      }
      
      // Fechar modal imediatamente após salvar com sucesso
      onClose();
    } catch (error) {
      setPhotoLoading(false);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao salvar produção' 
      });
    }
  };

  const handlePhotoSelect = (file: File) => {
    setPhotoFile(file);
  };

  const handlePhotoRemove = () => {
    setPhotoFile(null);
  };

  const handlePhotoManagerRemove = async () => {
    if (!rowId) return;
    
    try {
      setPhotoLoading(true);
      const res = await fetch(`/api/photo/${rowId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao remover foto');
      }
      
      // Atualizar formData para remover dados da foto
      setFormData(prev => ({
        ...prev,
        photoUrl: undefined,
        photoId: undefined,
        photoUploadedAt: undefined,
      }));
      
      setMessage({ type: 'success', text: 'Foto removida com sucesso!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao remover foto' 
      });
    } finally {
      setPhotoLoading(false);
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
    setPhotoFile(null);
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

            {/* Seção de Foto */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Foto da Produção</h3>
              
              {/* Mostrar botão "Ver Foto" se houver foto */}
              {formData.photoUrl && (
                <div className="mb-4">
                  <PhotoManager
                    photoUrl={formData.photoUrl}
                    photoId={formData.photoId}
                    onPhotoRemove={handlePhotoManagerRemove}
                    loading={photoLoading}
                    disabled={loading}
                    showRemoveButton={true}
                  />
                </div>
              )}
              
              {/* Input de upload sempre disponível */}
              <PhotoUploader
                onPhotoSelect={handlePhotoSelect}
                onPhotoRemove={handlePhotoRemove}
                loading={photoLoading}
                disabled={loading}
                currentPhotoUrl={formData.photoUrl}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors font-medium"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar Produção'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
