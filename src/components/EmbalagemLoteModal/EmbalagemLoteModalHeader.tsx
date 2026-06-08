'use client';

import { calcularProgressoEmbalagemPedido } from '@/domain/embalagem/embalagem-lote-modal';

type Props = {
  title: string;
  produto: string;
  cliente: string;
  congelado: 'Sim' | 'Não';
  pedidoMetaOriginal?: { caixas: number; pacotes: number; unidades: number; kg: number };
  pedidoQuantidades?: { caixas: number; pacotes: number; unidades: number; kg: number };
  onClose: () => void;
  closeDisabled?: boolean;
};

export default function EmbalagemLoteModalHeader({
  title,
  produto,
  cliente,
  congelado,
  pedidoMetaOriginal,
  pedidoQuantidades,
  onClose,
  closeDisabled,
}: Props) {
  const progresso =
    pedidoMetaOriginal && pedidoQuantidades
      ? calcularProgressoEmbalagemPedido(pedidoMetaOriginal, pedidoQuantidades)
      : null;

  const partes = [title, produto, cliente].filter((p) => p.trim().length > 0);
  const tituloCompleto =
    partes.length > 1
      ? `${partes.join(' - ')}${congelado === 'Sim' ? ' · Congelado' : ''}`
      : title;

  return (
    <div className="px-5 pt-4 pb-5 sm:px-6 border-b border-gray-100 shrink-0">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3 sm:hidden" aria-hidden />
      <div className="flex justify-between items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2
            id="producao-modal-title"
            className="text-base sm:text-lg font-bold text-gray-900 truncate leading-snug"
            title={tituloCompleto}
          >
            {tituloCompleto}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Fechar"
        >
          <span className="material-icons text-2xl" aria-hidden>
            close
          </span>
        </button>
      </div>
      {progresso && progresso.meta > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>
              {progresso.produzido} / {progresso.meta} {progresso.label}
            </span>
            <span>{progresso.percentual}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-[width] motion-reduce:transition-none"
              style={{ width: `${progresso.percentual}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Restante: {progresso.restante} {progresso.label}
          </p>
        </div>
      )}
    </div>
  );
}
