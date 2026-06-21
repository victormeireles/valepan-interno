import type { OrdemProducaoPainelItem } from '@/domain/types/ordens-producao-painel';

export type OrdemProducaoRowBaseProps = {
  ordem: OrdemProducaoPainelItem;
  filterDate: string;
  isFirst: boolean;
  isLast: boolean;
  selected: boolean;
  onToggleSelect: (ordem: OrdemProducaoPainelItem) => void;
  onEdit: (ordem: OrdemProducaoPainelItem) => void;
  onDelete: (ordem: OrdemProducaoPainelItem) => void;
  onMoveUp: (ordem: OrdemProducaoPainelItem) => void;
  onMoveDown: (ordem: OrdemProducaoPainelItem) => void;
  onMoveToTop: (ordem: OrdemProducaoPainelItem) => void;
  onMoveToBottom: (ordem: OrdemProducaoPainelItem) => void;
};
