import { Badge } from '@/components/ui/Badge';

type Props = {
  ativo: boolean;
  ativoLabel?: string;
  inativoLabel?: string;
};

export default function ConfigAtivoBadge({
  ativo,
  ativoLabel = 'Ativo',
  inativoLabel = 'Inativo',
}: Props) {
  return (
    <Badge
      tone={ativo ? 'success' : 'neutral'}
      icon={ativo ? 'check_circle' : 'pause_circle'}
    >
      {ativo ? ativoLabel : inativoLabel}
    </Badge>
  );
}
