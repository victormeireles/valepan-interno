import type { OrdemProducaoPainelItem } from '@/domain/types/ordens-producao-painel';

export type OrdemProducaoRowBaseProps = {
  ordem: OrdemProducaoPainelItem;
  filterDate: string;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (ordem: OrdemProducaoPainelItem) => void;
  onDelete: (ordem: OrdemProducaoPainelItem) => void;
  onMoveUp: (ordem: OrdemProducaoPainelItem) => void;
  onMoveDown: (ordem: OrdemProducaoPainelItem) => void;
};
