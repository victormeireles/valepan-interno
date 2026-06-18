'use client';

import { getClienteInicial } from '@/lib/utils/cliente-display';

interface EtapaCardTitleRowProps {
  cliente?: string;
  produto: string;
  assadeiraNome?: string;
  observacao?: string;
  congelado?: boolean;
}

function TitleSeparator() {
  return <span className="text-gray-500 text-xs flex-shrink-0">·</span>;
}

export default function EtapaCardTitleRow({
  cliente,
  produto,
  assadeiraNome,
  observacao,
  congelado = false,
}: EtapaCardTitleRowProps) {
  const hasCliente = Boolean(cliente?.trim());
  const hasAssadeira = Boolean(assadeiraNome?.trim());
  const hasObservacao = Boolean(observacao?.trim());

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
      {hasCliente ? (
        <span
          className="
            inline-flex items-center justify-center
            min-w-5 h-5 px-1 rounded
            bg-gray-700/90 text-[11px] font-bold text-amber-200 uppercase
            flex-shrink-0
          "
          title={cliente}
          aria-label={`Cliente ${cliente}`}
        >
          {getClienteInicial(cliente!)}
        </span>
      ) : null}

      {hasCliente ? <TitleSeparator /> : null}

      <span className="text-sm font-semibold text-white break-words">{produto}</span>

      {hasAssadeira ? (
        <>
          <TitleSeparator />
          <span className="text-xs text-gray-300 flex-shrink-0">{assadeiraNome}</span>
        </>
      ) : null}

      {hasObservacao ? (
        <>
          <TitleSeparator />
          <span className="text-xs text-gray-400 italic flex-shrink-0">{observacao}</span>
        </>
      ) : null}

      {congelado ? (
        <span className="material-icons text-blue-300 text-xs flex-shrink-0">ac_unit</span>
      ) : null}
    </div>
  );
}
