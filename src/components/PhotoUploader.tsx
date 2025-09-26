'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface PhotoUploaderProps {
  onPhotoSelect: (file: File) => void;
  onPhotoRemove: () => void;
  loading?: boolean;
  disabled?: boolean;
  currentPhotoUrl?: string;
}

export default function PhotoUploader({
  onPhotoSelect,
  onPhotoRemove,
  loading = false,
  disabled = false,
  currentPhotoUrl
}: PhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('O arquivo é muito grande (máx. 5MB)');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Apenas arquivos de imagem são permitidos');
        return;
      }
      setPreview(URL.createObjectURL(file));
      onPhotoSelect(file);
    }
  }, [onPhotoSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    disabled: loading || disabled,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    }
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onPhotoRemove();
  };

  return (
    <div className="space-y-4">
      {/* Área de upload */}
      <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        {preview ? (
          <div className="relative w-full h-32 flex items-center justify-center">
            <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600 transition-colors"
              disabled={loading || disabled}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        ) : (
          <>
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              {isDragActive ? 'Solte a imagem aqui...' : 'Arraste e solte uma imagem ou clique para selecionar'}
            </p>
            <p className="text-xs text-gray-500">JPG, PNG, WebP (máx. 5MB)</p>
            {currentPhotoUrl && (
              <p className="text-xs text-blue-600 mt-2">
                📷 Já existe uma foto. Selecione uma nova para substituir.
              </p>
            )}
          </>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
