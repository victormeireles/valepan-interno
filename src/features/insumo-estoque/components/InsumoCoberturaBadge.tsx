import { Badge } from '@/components/ui/Badge';
import { formatCoberturaDias } from '@/features/insumo-estoque/utils/formatters';
import { insumoCoberturaVisualTone } from '@/features/insumo-estoque/insumo-cobertura-visual-tone';

type Props = {
  dias: number | null;
  className?: string;
};

export default function InsumoCoberturaBadge({ dias, className = '' }: Props) {
  const visual = insumoCoberturaVisualTone.resolve(dias);

  return (
    <Badge
      tone={visual.tone}
      numeric
      pill={false}
      className={`justify-end ${className}`}
      title={visual.label}
      aria-label={visual.label}
    >
      {formatCoberturaDias(dias)}
    </Badge>
  );
}
