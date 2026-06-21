import type { AssadeiraDisplayVariant } from '@/domain/ordens-producao/ordem-assadeira-display';
import { ordensProducaoTableTextTruncateClass } from '@/components/OrdensProducao/ordens-producao-table-layout';
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
    return <span className="text-[13px] text-stone-400">—</span>;
  }

  const label = nome ?? '—';

  if (variant === 'alternativa') {
    return (
      <span
        className="inline-flex max-w-full min-w-0 items-center gap-1"
        title={`${label} (assadeira alternativa)`}
      >
        <span className="truncate text-[13px] font-medium text-stone-800">{label}</span>
        <span className={`${ordensProducaoAssadeiraAltBadgeClass} shrink-0`} aria-label="Assadeira alternativa">
          alt.
        </span>
      </span>
    );
  }

  return (
    <span className={`${ordensProducaoTableTextTruncateClass} text-[13px] text-stone-600`} title={label}>
      {label}
    </span>
  );
}
