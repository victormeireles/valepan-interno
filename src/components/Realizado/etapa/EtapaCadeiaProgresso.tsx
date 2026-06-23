'use client';

import type { EtapaCadeiaBarra } from './etapa-cadeia-progresso-types';

type EtapaCadeiaProgressoProps = {
  barras: EtapaCadeiaBarra[];
};

function formatQuantidade(valor: number, unidade: string): string {
  const formatado = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Number.isInteger(valor) ? 0 : 1,
    maximumFractionDigits: Number.isInteger(valor) ? 0 : 3,
  }).format(valor);
  return `${formatado} ${unidade.toUpperCase()}`;
}

function resolveValorBarra(barra: EtapaCadeiaBarra): number {
  if (typeof barra.estimativaAoVivo === 'number') {
    return barra.estimativaAoVivo;
  }
  return barra.produzido;
}

function resolveProgressoPct(barra: EtapaCadeiaBarra): number {
  if (barra.meta <= 0) return 0;
  return Math.min(100, Math.round((resolveValorBarra(barra) / barra.meta) * 100));
}

function resolveOverflow(barra: EtapaCadeiaBarra): number {
  if (barra.meta <= 0) return 0;
  return Math.max(0, resolveValorBarra(barra) - barra.meta);
}

function BarraStatus({ barra }: { barra: EtapaCadeiaBarra }) {
  if (barra.finalizada) {
    return (
      <span
        className="material-icons text-base leading-none text-emerald-600"
        title="Etapa finalizada"
        aria-label="Etapa finalizada"
      >
        check_circle
      </span>
    );
  }

  if (typeof barra.estimativaAoVivo === 'number') {
    return (
      <span
        className="material-icons text-base leading-none text-amber-600"
        title="Estimativa ao vivo"
        aria-label="Estimativa ao vivo"
      >
        schedule
      </span>
    );
  }

  return null;
}

function EtapaCadeiaProgressoItem({ barra }: { barra: EtapaCadeiaBarra }) {
  const valorVisual = resolveValorBarra(barra);
  const progressoPct = resolveProgressoPct(barra);
  const overflow = resolveOverflow(barra);
  const badgeOverflow =
    overflow > 0 ? `+${formatQuantidade(overflow, barra.unidade)}` : null;

  const trilhaClass = barra.destaque ? 'h-2 bg-amber-100' : 'h-1 bg-stone-200';
  const preenchimentoClass = barra.destaque ? 'bg-amber-600' : 'bg-stone-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="material-icons text-base text-stone-600" aria-hidden="true">
            {barra.icon}
          </span>
          <span className="truncate text-xs font-medium text-stone-700">{barra.label}</span>
          <BarraStatus barra={barra} />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums text-stone-600">
          {typeof barra.estimativaAoVivo === 'number' ? (
            <span className="text-amber-700">~{formatQuantidade(valorVisual, barra.unidade)}</span>
          ) : (
            <span>{formatQuantidade(valorVisual, barra.unidade)}</span>
          )}
          <span className="text-stone-400">/</span>
          <span>{formatQuantidade(barra.meta, barra.unidade)}</span>
          {badgeOverflow ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-800">
              {badgeOverflow}
            </span>
          ) : null}
        </div>
      </div>

      <div className={['w-full overflow-hidden rounded-full', trilhaClass].join(' ')}>
        <div
          className={['h-full rounded-full transition-[width] duration-200', preenchimentoClass].join(' ')}
          style={{ width: `${progressoPct}%` }}
        />
      </div>
    </div>
  );
}

export default function EtapaCadeiaProgresso({ barras }: EtapaCadeiaProgressoProps) {
  if (barras.length === 0) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="space-y-2">
        {barras.map((barra) => (
          <EtapaCadeiaProgressoItem
            key={`${barra.slug}-${barra.label}`}
            barra={barra}
          />
        ))}
      </div>
    </div>
  );
}
