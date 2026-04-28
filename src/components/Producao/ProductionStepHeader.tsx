/**
 * Header compartilhado para telas de etapas de produção
 */

import Link from 'next/link';

interface ProductionStepHeaderProps {
  etapaNome: string;
  loteCodigo: string;
  produtoNome: string;
  /** Se false, omite a linha “lote — produto” abaixo do título (ex.: Massa). Default: true */
  showLoteProdutoSubtitle?: boolean;
  /** Tipografia e padding menores no mobile */
  dense?: boolean;
  /** Link “Voltar” no canto superior esquerdo (ex.: fila da estação) */
  backHref?: string;
  backLabel?: string;
}

export default function ProductionStepHeader({
  etapaNome,
  loteCodigo,
  produtoNome,
  showLoteProdutoSubtitle = true,
  dense = false,
  backHref,
  backLabel = 'Voltar',
}: ProductionStepHeaderProps) {
  const pad = dense
    ? 'bg-gray-50/50 border-b border-gray-100 px-3 py-2.5 sm:px-6 sm:py-4'
    : 'bg-gray-50/50 border-b border-gray-100 px-6 py-4';

  const titleClass =
    dense
      ? 'text-base font-bold leading-snug text-gray-900 sm:text-xl'
      : 'text-xl font-bold text-gray-900';

  const subtitleClass =
    dense
      ? 'mt-0.5 text-[11px] leading-snug text-gray-500 sm:text-xs'
      : 'text-xs text-gray-500 sm:text-sm';

  const backBtnClass =
    'inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center gap-0.5 rounded-lg border border-gray-200/90 bg-white px-2 text-xs font-semibold text-gray-800 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 touch-manipulation sm:min-h-0 sm:min-w-0 sm:gap-1 sm:px-2.5 sm:py-1.5 sm:text-sm';

  return (
    <div className={pad}>
      <div className="flex items-start gap-2 sm:gap-3">
        {backHref ? (
          <Link href={backHref} className={backBtnClass} aria-label={backLabel}>
            <span className="material-icons text-lg leading-none sm:text-xl" aria-hidden>
              arrow_back
            </span>
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
        ) : null}
        <div className="min-w-0 flex-1 pt-0.5 sm:pt-0">
          <h2 className={titleClass}>
            Etapa: {etapaNome}
          </h2>
          {showLoteProdutoSubtitle ? (
            <p className={subtitleClass}>
              {loteCodigo} - {produtoNome}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}







