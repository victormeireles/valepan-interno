type Props = {
  tipoLataNome: string | null;
  observacaoProducao: string | null;
};

/**
 * Faixa informativa no topo das etapas (massa/fermentação) com o tipo de lata e a
 * observação de produção em destaque tipográfico — ex.: indica se a lata deve ser lavada depois.
 * Texto escrito no próprio card, sem estilo de alerta/pop-up.
 */
export default function OrdemDestaqueLataObs({ tipoLataNome, observacaoProducao }: Props) {
  const lata = tipoLataNome?.trim();
  const obs = observacaoProducao?.trim();
  if (!lata && !obs) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 sm:rounded-xl sm:px-4 sm:py-3">
      {lata ? (
        <p className="flex items-baseline gap-1.5 text-sm sm:text-base">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm">
            Lata
          </span>
          <span className="font-bold text-slate-900">{lata}</span>
        </p>
      ) : null}
      {obs ? (
        <div className={lata ? 'mt-1.5' : ''}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm">
            Observação da produção
          </p>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm font-semibold leading-snug text-slate-900 sm:text-base">
            {obs}
          </p>
        </div>
      ) : null}
    </div>
  );
}
