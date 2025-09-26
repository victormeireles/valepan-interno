'use client';

import { useState } from 'react';

interface PhotoManagerProps {
  photoUrl?: string;
  photoId?: string;
  onPhotoRemove: () => void;
  loading?: boolean;
  disabled?: boolean;
  showRemoveButton?: boolean;
  className?: string;
}

export default function PhotoManager({
  photoUrl,
  onPhotoRemove,
  loading = false,
  disabled = false,
  showRemoveButton = true,
  className = ''
}: PhotoManagerProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || loading || isRemoving) return;
    
    if (window.confirm('Tem certeza que deseja remover esta foto?')) {
      setIsRemoving(true);
      try {
        await onPhotoRemove();
      } finally {
        setIsRemoving(false);
      }
    }
  };

  const handleViewPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (photoUrl) {
      window.open(photoUrl, '_blank');
    }
  };

  if (!photoUrl) {
    return (
      <div className={`text-center text-gray-500 ${className}`}>
        <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">Nenhuma foto</p>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <div className="flex items-center justify-center bg-green-50 border-2 border-green-200 rounded-lg p-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-3">
            <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="ml-2 text-2xl">📷</span>
          </div>
          <p className="text-sm text-green-700 font-medium mb-3">Foto disponível</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleViewPhoto}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Ver Foto
            </button>
            {showRemoveButton && (
              <button
                onClick={handleRemove}
                disabled={disabled || loading || isRemoving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isRemoving ? 'Removendo...' : 'Remover'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Processando...</span>
          </div>
        </div>
      )}
    </div>
  );
}
