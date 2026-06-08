'use client';

import PhotoManager from '@/components/PhotoManager';
import PhotoUploader from '@/components/PhotoUploader';
import { contarFotosEmbalagem, slotsFotoEmbalagem } from '@/domain/embalagem/embalagem-lote-modal';
import type { ProducaoData } from '@/domain/types';
import type { PhotoFiles } from '@/domain/validators/PhotoValidator';

type SlotFoto = 'pacote' | 'etiqueta' | 'pallet';

const SLOT_LABELS: Record<SlotFoto, string> = {
  pacote: 'Pacote',
  etiqueta: 'Etiqueta',
  pallet: 'Pallet',
};

type Props = {
  cliente: string;
  formData: ProducaoData;
  photoFiles: PhotoFiles;
  photoLoading: boolean;
  loading: boolean;
  onPhotoSelect: (file: File, type: SlotFoto) => void;
  onPhotoRemove: (type: SlotFoto) => void;
  onPhotoManagerRemove: (type: SlotFoto) => void;
  onRemoveRequest: (type: SlotFoto) => void;
};

function getSavedUrl(formData: ProducaoData, slot: SlotFoto): string | undefined {
  if (slot === 'pacote') return formData.pacoteFotoUrl;
  if (slot === 'etiqueta') return formData.etiquetaFotoUrl;
  return formData.palletFotoUrl;
}

function getSavedId(formData: ProducaoData, slot: SlotFoto): string | undefined {
  if (slot === 'pacote') return formData.pacoteFotoId;
  if (slot === 'etiqueta') return formData.etiquetaFotoId;
  return formData.palletFotoId;
}

export default function EmbalagemFotosGrid({
  cliente,
  formData,
  photoFiles,
  photoLoading,
  loading,
  onPhotoSelect,
  onPhotoRemove,
  onPhotoManagerRemove,
  onRemoveRequest,
}: Props) {
  const slots = slotsFotoEmbalagem(cliente);
  const { preenchidas, total } = contarFotosEmbalagem(formData, photoFiles, cliente);
  const gridCols = slots.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-800 mb-3">
        Fotos · {preenchidas}/{total}
      </h3>
      <div className={`grid ${gridCols} gap-3`}>
        {slots.map((slot) => {
          const savedUrl = getSavedUrl(formData, slot);
          const hasNewFile = Boolean(photoFiles[slot]);
          const showSavedOnly = Boolean(savedUrl) && !hasNewFile;

          return (
            <div key={slot} className="min-w-0">
              <p className="text-xs font-medium text-gray-600 mb-1 text-center truncate">
                {SLOT_LABELS[slot]}
              </p>
              {showSavedOnly ? (
                <PhotoManager
                  photoUrl={savedUrl}
                  photoId={getSavedId(formData, slot)}
                  onPhotoRemove={() => onPhotoManagerRemove(slot)}
                  onRemoveRequest={() => onRemoveRequest(slot)}
                  loading={photoLoading}
                  disabled={loading}
                  variant="inline"
                  showRemoveButton
                />
              ) : (
                <PhotoUploader
                  variant="compact"
                  onPhotoSelect={(file) => onPhotoSelect(file, slot)}
                  onPhotoRemove={() => onPhotoRemove(slot)}
                  loading={photoLoading}
                  disabled={loading}
                  currentPhotoUrl={savedUrl}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
