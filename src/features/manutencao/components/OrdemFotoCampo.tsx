'use client';

import PhotoManager from '@/components/PhotoManager';
import PhotoUploader from '@/components/PhotoUploader';

type OrdemFotoCampoProps = {
  salvaUrl?: string;
  salvaId?: string;
  mostrarSalva: boolean;
  removida: boolean;
  desabilitado: boolean;
  onSelecionar: (file: File) => void;
  onRemoverNova: () => void;
  onRemoverSalva: () => void;
};

export function OrdemFotoCampo({
  salvaUrl,
  salvaId,
  mostrarSalva,
  removida,
  desabilitado,
  onSelecionar,
  onRemoverNova,
  onRemoverSalva,
}: OrdemFotoCampoProps) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-medium tracking-[-0.004em] text-stone-700">Foto</h3>
        <p className="text-xs text-stone-500">Opcional</p>
      </div>
      {mostrarSalva && salvaUrl ? (
        <PhotoManager
          photoUrl={salvaUrl}
          photoId={salvaId}
          onPhotoRemove={onRemoverSalva}
          disabled={desabilitado}
          variant="inline"
          showRemoveButton
        />
      ) : (
        <PhotoUploader
          variant="compact"
          onPhotoSelect={onSelecionar}
          onPhotoRemove={onRemoverNova}
          disabled={desabilitado}
        />
      )}
      {removida ? (
        <p className="text-sm text-amber-800">A foto será removida ao salvar.</p>
      ) : null}
    </section>
  );
}
