'use client';

interface PhotoViewerProps {
  photoUrl?: string;
  className?: string;
}

export default function PhotoViewer({
  photoUrl,
  className = ''
}: PhotoViewerProps) {
  if (!photoUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">Sem foto</p>
        </div>
      </div>
    );
  }

  const handleViewPhoto = () => {
    window.open(photoUrl, '_blank');
  };

  return (
    <div className={`flex items-center justify-center bg-green-50 border-2 border-green-200 rounded-lg ${className}`}>
      <div className="text-center p-4">
        <div className="flex items-center justify-center mb-3">
          <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="ml-2 text-2xl">📷</span>
        </div>
        <p className="text-sm text-green-700 font-medium mb-3">Foto disponível</p>
        <button
          onClick={handleViewPhoto}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          Ver Foto
        </button>
      </div>
    </div>
  );
}
