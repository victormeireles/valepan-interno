import { posicaoPopoverAncora } from '@/features/reclamacoes/components/reclamacao-popover-posicao';

const PREVIEW_SIZE_PX = 176;

export function posicaoMiniaturaFoto(anchor: {
  left: number;
  right: number;
  top: number;
  height: number;
}): { top: number; left: number } {
  return posicaoPopoverAncora(anchor, { width: PREVIEW_SIZE_PX, height: PREVIEW_SIZE_PX });
}
