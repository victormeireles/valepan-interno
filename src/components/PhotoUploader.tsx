'use client';

import { useState, useCallback, useRef, useId } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { compressImage } from '@/utils/imageCompression';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentPhotoUrl: _currentPhotoUrl // Reservado para uso futuro
}: PhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputId = useId();

  const zoneDisabled = loading || disabled || compressing;

  const isLikelyImageFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) return true;
    // Android/galeria às vezes envia type vazio; usa extensão
    if (!file.type || file.type === 'application/octet-stream') {
      return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name);
    }
    return false;
  }, []);

  const handleFileValidation = useCallback(
    (file: File) => {
      setError(null);
      if (!isLikelyImageFile(file)) {
        setError('Apenas arquivos de imagem são permitidos');
        return false;
      }
      return true;
    },
    [isLikelyImageFile],
  );

  const processFile = useCallback(async (file: File) => {
    if (!handleFileValidation(file)) {
      return;
    }

    setCompressing(true);
    setError(null);

    try {
      const compressedFile = await compressImage(file, 4);

      if (compressedFile.size > 4 * 1024 * 1024) {
        setError('Não foi possível comprimir a imagem o suficiente. Tente uma foto com menos detalhes.');
        setCompressing(false);
        return;
      }

      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(compressedFile);
      });
      onPhotoSelect(compressedFile);
    } catch {
      setError('Erro ao processar imagem. Tente novamente.');
    } finally {
      setCompressing(false);
    }
  }, [handleFileValidation, onPhotoSelect]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        processFile(file);
      }
    },
    [processFile],
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      setError('Arquivo não aceito. Use uma imagem (JPG, PNG, WebP, etc.).');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, inputRef } = useDropzone({
    onDrop,
    onDropRejected,
    disabled: zoneDisabled,
    maxFiles: 1,
    multiple: false,
    /** Clique abre o arquivo via <label htmlFor> (nativo); evita falhas do clique sintético no input */
    noClick: true,
    noKeyboard: true,
    useFsAccessApi: false,
    accept: {
      'image/*': [],
    },
  });

  const inputProps = getInputProps({
    id: galleryInputId,
  });

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      processFile(file);
    }
    e.target.value = '';
  };

  const handleOpenCamera = () => {
    cameraInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    onPhotoRemove();
  };

  const openGalleryPicker = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      {/* Área de upload: arrastar + label nativo para escolher arquivo */}
      <div
        className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
        } ${zoneDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        {...getRootProps()}
      >
        <input {...inputProps} />
        {compressing ? (
          <div className="flex flex-col items-center justify-center py-4">
            <svg className="animate-spin h-6 w-6 text-blue-600 mb-1" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-xs text-gray-600">Comprimindo...</p>
          </div>
        ) : preview ? (
          <div className="space-y-2">
            <div className="relative w-full min-h-[6rem] flex items-center justify-center py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Pré-visualização da foto" className="max-w-full max-h-40 object-contain rounded-lg" />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 text-xs hover:bg-red-600 transition-colors z-10"
                disabled={loading || disabled}
                aria-label="Remover foto"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openGalleryPicker();
              }}
              disabled={zoneDisabled}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:no-underline"
            >
              Escolher outra foto
            </button>
          </div>
        ) : (
          <label
            htmlFor={galleryInputId}
            className={`flex items-center justify-center gap-2 py-2 ${zoneDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <svg className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              ></path>
            </svg>
            <div className="text-left">
              <p className="text-xs text-gray-600">
                {isDragActive ? 'Solte aqui...' : 'Clique para selecionar ou arraste'}
              </p>
              <p className="text-xs text-gray-400">Imagens (JPG, PNG, WebP…)</p>
            </div>
          </label>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      <button
        type="button"
        onClick={handleOpenCamera}
        disabled={zoneDisabled}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          ></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        Tirar Foto
      </button>

      {/* sr-only: alguns navegadores não disparam file picker em input display:none */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
