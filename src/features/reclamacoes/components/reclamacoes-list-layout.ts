import type { ListColumnHeaderItem } from '@/components/ui/ListColumnHeader';

export const RECLAMACAO_COL_CATEGORIA = '9rem';
export const RECLAMACAO_COL_QUANTIDADE = '6.5rem';
export const RECLAMACAO_COL_PROBLEMA = '6.5rem';
export const RECLAMACAO_COL_FABRICACAO = '7.25rem';
export const RECLAMACAO_COL_OBS = '3.25rem';
export const RECLAMACAO_COL_FOTO = '3.25rem';

export const RECLAMACAO_LIST_HEADERS: ListColumnHeaderItem[] = [
  { label: 'Categoria', width: RECLAMACAO_COL_CATEGORIA, align: 'left' },
  { label: 'Qtd', width: RECLAMACAO_COL_QUANTIDADE },
  { label: 'Problema', width: RECLAMACAO_COL_PROBLEMA },
  { label: 'Fabricação', width: RECLAMACAO_COL_FABRICACAO },
  { label: 'Obs.', width: RECLAMACAO_COL_OBS },
  { label: 'Foto', width: RECLAMACAO_COL_FOTO },
];
