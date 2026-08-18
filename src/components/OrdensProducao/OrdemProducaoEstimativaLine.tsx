'use client';

import {
  formatEstimativaClockHHmm,
} from '@/domain/estimativa-producao/estimativa-producao-format';
import type { OrdemProducaoEstimativaView } from '@/domain/types/ordens-producao-painel';

const STAGES: Array<{ key: keyof OrdemProducaoEstimativaView; label: string }> = [
  { key: 'fermentacaoFim', label: 'Ferm' },
  { key: 'camaraFim', label: 'Câmara' },
  { key: 'fornoFim', label: 'Forno' },
  { key: 'resfriamentoFim', label: 'Resfrio' },
  { key: 'embalagemFim', label: 'Emb' },
];

type OrdemProducaoEstimativaLineProps = {
  estimativa: OrdemProducaoEstimativaView | null;
};

export default function OrdemProducaoEstimativaLine({
  estimativa,
}: OrdemProducaoEstimativaLineProps) {
  if (!estimativa) return null;

  return (
    <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-stone-500">
      {STAGES.map((stage, index) => (
        <span key={stage.key}>
          {index > 0 ? <span className="text-stone-300"> · </span> : null}
          <span className="tracking-wide text-stone-400">{stage.label}</span>{' '}
          {formatEstimativaClockHHmm(estimativa[stage.key]) ?? '—'}
        </span>
      ))}
    </span>
  );
}
