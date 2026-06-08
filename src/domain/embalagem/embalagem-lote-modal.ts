import { isSpecialPhotoClient } from '@/config/photoRules';
import type { ProducaoData } from '@/domain/types';
import type { PhotoFiles } from '@/domain/validators/PhotoValidator';

type Quantidade = {
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
};

export type ProgressoEmbalagemPedido = {
  dimensao: keyof Quantidade;
  label: string;
  meta: number;
  produzido: number;
  restante: number;
  percentual: number;
};

const LABEL: Record<keyof Quantidade, string> = {
  caixas: 'cx',
  pacotes: 'pct',
  unidades: 'un',
  kg: 'kg',
};

function dimensaoPrincipal(meta: Quantidade): keyof Quantidade {
  if (meta.caixas > 0 || meta.pacotes > 0) return 'caixas';
  if (meta.unidades > 0) return 'unidades';
  if (meta.kg > 0) return 'kg';
  return 'caixas';
}

export function calcularProgressoEmbalagemPedido(
  meta: Quantidade,
  saldo: Quantidade,
): ProgressoEmbalagemPedido {
  const dim = dimensaoPrincipal(meta);
  const metaVal = meta[dim] || 0;
  const restante = saldo[dim] || 0;
  const produzido = Math.max(0, metaVal - restante);
  const percentual = metaVal > 0 ? Math.min(100, Math.round((produzido / metaVal) * 100)) : 0;
  return {
    dimensao: dim,
    label: LABEL[dim],
    meta: metaVal,
    produzido,
    restante,
    percentual,
  };
}

type SlotFoto = 'pacote' | 'etiqueta' | 'pallet';

function slotPreenchido(
  slot: SlotFoto,
  formData: ProducaoData,
  photoFiles: PhotoFiles,
): boolean {
  if (slot === 'pacote') return Boolean(formData.pacoteFotoUrl || photoFiles.pacote);
  if (slot === 'etiqueta') return Boolean(formData.etiquetaFotoUrl || photoFiles.etiqueta);
  return Boolean(formData.palletFotoUrl || photoFiles.pallet);
}

export function contarFotosEmbalagem(
  formData: ProducaoData,
  photoFiles: PhotoFiles,
  cliente: string,
): { preenchidas: number; total: number } {
  const slots = slotsFotoEmbalagem(cliente);
  const preenchidas = slots.filter((s) => slotPreenchido(s, formData, photoFiles)).length;
  return { preenchidas, total: slots.length };
}

export function slotsFotoEmbalagem(cliente: string): SlotFoto[] {
  return isSpecialPhotoClient(cliente)
    ? ['pacote', 'pallet']
    : ['pacote', 'etiqueta', 'pallet'];
}
