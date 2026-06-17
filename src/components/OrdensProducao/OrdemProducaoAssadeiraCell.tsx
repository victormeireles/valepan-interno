import type { AssadeiraDisplayVariant } from '@/domain/ordens-producao/ordem-assadeira-display';
import { ordensProducaoAssadeiraAltBadgeClass } from '@/components/OrdensProducao/ordens-producao-theme';

type OrdemProducaoAssadeiraCellProps = {
  variant: AssadeiraDisplayVariant;
  nome?: string;
};

export default function OrdemProducaoAssadeiraCell({
  variant,
  nome,
}: OrdemProducaoAssadeiraCellProps) {
  if (variant === 'sem') {
    return <span className="text-sm text-stone-400">—</span>;
  }

  const label = nome ?? '—';

  if (variant === 'alternativa') {
    return (
      <span
        className="inline-flex max-w-full min-w-0 items-center gap-1"
        title="Assadeira diferente da padrão do produto"
      >
        <span className="truncate text-sm font-medium text-stone-800">{label}</span>
        <span className={ordensProducaoAssadeiraAltBadgeClass} aria-label="Assadeira alternativa">
          alt.
        </span>
      </span>
    );
  }

  return <span className="truncate text-sm text-stone-600">{label}</span>;
}
