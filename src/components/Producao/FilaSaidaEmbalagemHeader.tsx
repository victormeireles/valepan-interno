'use client';

function fmt(n: number) {
  const rounded = Math.abs(n % 1) < 0.05 ? Math.round(n) : n;
  return rounded.toLocaleString('pt-BR', { maximumFractionDigits: rounded % 1 === 0 ? 0 : 1 });
}

type FilaSaidaEmbalagemHeaderProps = {
  metaCaixasSoma: number;
  caixasInformadasSoma: number;
  lotesEntradaTotal: number;
  /** Explica se a soma é só do dia filtrado ou todas as pendentes. */
  escopoOrdensLegenda: string;
};

/**
 * Resumo na fila de saída de embalagem: lotes na entrada da embalagem e progresso de caixas (soma das ordens visíveis).
 */
export default function FilaSaidaEmbalagemHeader({
  metaCaixasSoma,
  caixasInformadasSoma,
  lotesEntradaTotal,
  escopoOrdensLegenda,
}: FilaSaidaEmbalagemHeaderProps) {
  const pct =
    metaCaixasSoma > 0
      ? Math.min(100, (caixasInformadasSoma / metaCaixasSoma) * 100)
      : caixasInformadasSoma > 0
        ? 100
        : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
      <div className="mb-2 sm:mb-3">
        <p className="text-xs font-semibold text-slate-900 sm:text-sm">Saída de embalagem — fila</p>
        <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{escopoOrdensLegenda}</p>
        <p className="mt-1 text-[10px] text-slate-600 sm:text-xs">
          Lotes já registrados na entrada da embalagem:{' '}
          <span className="font-semibold tabular-nums text-slate-800">{fmt(lotesEntradaTotal)}</span>
        </p>
      </div>

      <div
        className="relative h-4 min-w-0 w-full overflow-hidden rounded-full bg-slate-200 sm:h-5"
        role="img"
        aria-label={
          metaCaixasSoma > 0
            ? `Caixas embaladas ${fmt(caixasInformadasSoma)} de ${fmt(metaCaixasSoma)} nas ordens visíveis`
            : `Caixas informadas nas ordens visíveis: ${fmt(caixasInformadasSoma)}`
        }
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-[11px] tabular-nums leading-snug text-slate-600 sm:text-sm">
        <span className="font-semibold text-slate-800">
          {fmt(caixasInformadasSoma)}
          {metaCaixasSoma > 0 ? ` / ${fmt(metaCaixasSoma)}` : ''} caixas
        </span>
        {metaCaixasSoma > 0
          ? ' informadas vs referência do planejado (soma das ordens listadas abaixo)'
          : ' informadas (soma das ordens listadas abaixo); defina unidades por caixa no produto para ver a referência em caixas.'}
      </p>
    </div>
  );
}
