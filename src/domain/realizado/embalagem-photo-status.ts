import { isSpecialPhotoClient } from '@/config/photoRules';

export type EmbalagemPhotoFields = {
  cliente: string;
  produzido: number;
  pacoteFotoUrl?: string;
  etiquetaFotoUrl?: string;
  palletFotoUrl?: string;
};

export function getEmbalagemPhotoStatus(
  item: EmbalagemPhotoFields,
): { hasPhoto: boolean; color: 'white' | 'yellow' | 'red' } {
  const hasPacote = Boolean(item.pacoteFotoUrl);
  const hasEtiqueta = Boolean(item.etiquetaFotoUrl);
  const hasPallet = Boolean(item.palletFotoUrl);
  const isSpecial = isSpecialPhotoClient(item.cliente);

  if (item.produzido === 0) {
    return { hasPhoto: false, color: 'white' };
  }

  if (!hasPacote && !hasEtiqueta && !hasPallet) {
    return { hasPhoto: true, color: 'red' };
  }

  const hasAllPhotos = isSpecial
    ? hasPacote && hasPallet
    : hasPacote && hasEtiqueta && hasPallet;

  return {
    hasPhoto: true,
    color: hasAllPhotos ? 'white' : 'yellow',
  };
}
