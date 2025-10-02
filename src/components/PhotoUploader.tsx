'use client';

import { useState, useCallback, useRef } from 'react';
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
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileValidation = (file: File) => {
    setError(null);
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('O arquivo é muito grande (máx. 5MB)');
      return false;
    }
    if (!file.type.startsWith('image/')) {
      setError('Apenas arquivos de imagem são permitidos');
      return false;
    }
    return true;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (handleFileValidation(file)) {
        setPreview(URL.createObjectURL(file));
        onPhotoSelect(file);
      }
    }
  }, [onPhotoSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    disabled: loading || disabled,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    }
  });

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (handleFileValidation(file)) {
        setPreview(URL.createObjectURL(file));
        onPhotoSelect(file);
      }
    }
  };

  const handleOpenCamera = () => {
    cameraInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onPhotoRemove();
  };

  return (
    <div className="space-y-3">
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

      {/* Botão para Tirar Foto (força abertura da câmera) */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleOpenCamera}
          disabled={loading || disabled}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          📸 Tirar Foto
        </button>
      </div>

      {/* Input hidden para captura direta da câmera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />
    </div>
  );
}
