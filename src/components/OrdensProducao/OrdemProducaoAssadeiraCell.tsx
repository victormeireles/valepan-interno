import type { AssadeiraDisplayVariant } from '@/domain/ordens-producao/ordem-assadeira-display';
import { ordemAssadeiraVisual } from '@/components/OrdensProducao/ordem-assadeira-visual';

type OrdemProducaoAssadeiraCellProps = {
  variant: AssadeiraDisplayVariant;
  nome?: string;
  corHex?: string | null;
};

const PILL_BASE_CLASS =
  'inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border px-2 py-0.5';

export default function OrdemProducaoAssadeiraCell({
  variant,
  nome,
  corHex,
}: OrdemProducaoAssadeiraCellProps) {
  if (variant === 'sem') {
    return <span className="text-[13px] text-stone-400">—</span>;
  }

  const visual = ordemAssadeiraVisual.resolve(variant, corHex);
  const label = nome ?? '—';
  const title = variant === 'alternativa' ? `${label} (assadeira alternativa)` : label;

  return (
    <span className={PILL_BASE_CLASS} style={visual?.pill} title={title}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      <span className="truncate text-[11px] font-semibold tracking-wide">{label}</span>
      {variant === 'alternativa' ? (
        <span
          className="shrink-0 rounded-full bg-white/75 px-1 text-[9px] font-bold uppercase tracking-wide"
          aria-label="Assadeira alternativa"
        >
          alt.
        </span>
      ) : null}
    </span>
  );
}
