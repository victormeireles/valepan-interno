'use client';

import { IconButton } from '@/components/ui/IconButton';
import {
  PAINEL_PRODUCAO_STAGES,
  PAINEL_PRODUCAO_STATUS_META,
} from '@/domain/painel-producao/painel-producao-constants';
import {
  filaForno,
  stallOfProduct,
  statusOfProduct,
  tetoEmbalagem,
} from '@/domain/painel-producao/painel-producao-status';
import type {
  PainelProducaoProduct,
  PainelProducaoStageView,
  PainelProducaoStatus,
} from '@/domain/painel-producao/painel-producao-types';
import {
  formatPainelNumber,
  progressPctOfStage,
} from '@/components/PainelProducao/painel-producao-format';

type PainelProducaoProductRowProps = {
  product: PainelProducaoProduct;
  expanded: boolean;
  agoraMin: number;
  onToggle: (product: PainelProducaoProduct) => void;
};

function StatusChip({ status }: { status: PainelProducaoStatus }) {
  const meta = PAINEL_PRODUCAO_STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ background: meta.bg, color: meta.fg }}
    >
      <span className="material-icons text-[13px]" aria-hidden="true">
        {meta.icon}
      </span>
      {meta.label}
    </span>
  );
}

function StageCell({
  stage,
  accent,
  tick,
}: {
  stage: PainelProducaoStageView;
  accent: string;
  tick?: number | null;
}) {
  const pct = progressPctOfStage(stage);
  const full = stage.done >= stage.meta;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-1.5">
        <span className="whitespace-nowrap font-mono text-xs tabular-nums">
          <strong className={full ? 'text-success-fg' : 'text-text-strong'}>
            {formatPainelNumber(stage.done)}
          </strong>
          <span className="text-text-faint">
            {' '}
            / {formatPainelNumber(stage.meta)} {stage.unit}
          </span>
        </span>
        <span
          className={[
            'font-mono text-[11px] tabular-nums',
            full ? 'text-success-fg' : 'text-text-muted',
          ].join(' ')}
        >
          {pct}%
        </span>
      </div>
      <div className="relative mt-1 h-1 rounded-full bg-stone-100">
        <div
          className={[
            'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-[240ms] motion-safe:ease-out',
            full ? 'bg-success' : '',
          ].join(' ')}
          style={{
            width: `${pct}%`,
            ...(full ? {} : { background: accent }),
          }}
        />
        {tick != null && tick < 100 ? (
          <span
            title="Teto com o pão já assado"
            className="absolute bottom-[-2px] top-[-2px] w-0.5 rounded-sm bg-text-strong opacity-55"
            style={{ left: `${tick}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

function StageDetail({
  stageName,
  stageIcon,
  accent,
  stage,
}: {
  stageName: string;
  stageIcon: string;
  accent: string;
  stage: PainelProducaoStageView;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="material-icons text-[15px]" style={{ color: accent }} aria-hidden="true">
          {stageIcon}
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-text-muted">{stageName}</span>
        {stage.fim ? (
          <span className="ml-auto font-mono text-[11px] font-semibold tabular-nums text-success-fg">
            fim {stage.fim}
          </span>
        ) : null}
      </div>
      {stage.lotes.length ? (
        stage.lotes.map((lote, index) => (
          <div
            key={`${lote.hora}-${index}`}
            className={[
              'flex items-center gap-2 py-1',
              index < stage.lotes.length - 1 ? 'border-b border-stone-100' : '',
            ].join(' ')}
          >
            <span className="material-icons text-[15px] text-success-fg" aria-hidden="true">
              check_circle
            </span>
            <span className="text-xs text-text-muted">Lote {index + 1}</span>
            <span className="ml-auto font-mono text-xs font-semibold tabular-nums text-text-strong">
              {lote.qtd}
            </span>
            <span className="w-[38px] text-right font-mono text-[11px] tabular-nums text-text-muted">
              {lote.hora}
            </span>
          </div>
        ))
      ) : (
        <p className="my-0.5 text-xs text-text-faint">Nenhum lote ainda.</p>
      )}
    </div>
  );
}

export default function PainelProducaoProductRow({
  product,
  expanded,
  agoraMin,
  onToggle,
}: PainelProducaoProductRowProps) {
  const status = statusOfProduct(product);
  const stall = stallOfProduct(product, agoraMin);
  const fila = filaForno(product);
  const teto = tetoEmbalagem(product);
  const isDone = (stage: PainelProducaoStageView) => stage.done >= stage.meta;

  const ticks = {
    ferm: null,
    forno: null,
    emb:
      !isDone(product.emb) && teto < product.emb.meta
        ? Math.min(100, Math.round((teto / product.emb.meta) * 100))
        : null,
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(product)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle(product);
          }
        }}
        className="grid cursor-pointer grid-cols-1 items-center gap-2.5 px-2.5 py-2 hover:bg-stone-50 min-[860px]:grid-cols-[minmax(210px,1.3fr)_repeat(3,minmax(130px,1fr))_36px] min-[860px]:gap-3"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-text-strong">{product.name}</span>
            {product.congelado ? (
              <span
                className="material-icons shrink-0 text-[15px] text-sky-500"
                title="Congelado"
                aria-hidden="true"
              >
                ac_unit
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <StatusChip status={status} />
            {stall ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-danger-fg">
                <span className="material-icons text-[13px]" aria-hidden="true">
                  schedule
                </span>
                {stall.label}
              </span>
            ) : null}
          </div>
        </div>

        {PAINEL_PRODUCAO_STAGES.map((stage) => (
          <StageCell
            key={stage.key}
            stage={product[stage.key]}
            accent={stage.accent}
            tick={ticks[stage.key]}
          />
        ))}

        <IconButton
          icon={expanded ? 'expand_less' : 'expand_more'}
          label={expanded ? 'Recolher' : 'Ver lotes e horários'}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(product);
          }}
        />
      </div>

      {expanded ? (
        <div className="grid grid-cols-1 gap-4 border-t border-stone-100 bg-stone-50 px-3.5 py-3 min-[860px]:grid-cols-3">
          {PAINEL_PRODUCAO_STAGES.map((stage) => (
            <StageDetail
              key={stage.key}
              stageName={stage.name}
              stageIcon={stage.icon}
              accent={stage.accent}
              stage={product[stage.key]}
            />
          ))}
        </div>
      ) : null}

      {fila > 0 && !isDone(product.forno) ? (
        <span className="sr-only">{formatPainelNumber(fila)} latas prontas aguardando forno</span>
      ) : null}
    </div>
  );
}
