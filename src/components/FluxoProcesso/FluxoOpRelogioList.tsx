'use client';

import type { FluxoControleDia } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import type { FluxoEtapaKey } from '@/domain/fluxo-processo/fluxo-processo-types';
import FluxoOpRelogioRow from './FluxoOpRelogioRow';

type FluxoOpRelogioListProps = {
  etapa: FluxoEtapaKey;
  controle: FluxoControleDia | null;
};

/**
 * Relógio de OPs da etapa — previsto vs último lançamento e Δ em minutos.
 */
export default function FluxoOpRelogioList({
  etapa,
  controle,
}: FluxoOpRelogioListProps) {
  const disponivel = controle?.disponivel === true;
  const itens = disponivel ? (controle.relogio[etapa] ?? []) : [];
  const mostrarFifo = etapa === 'emb' && disponivel && controle.embalagemFifo;

  return (
    <div className="mt-3 border-t border-stone-100 pt-2.5">
      <div className="mb-1.5 text-[11px] font-medium text-text-muted">
        Relógio das OPs
      </div>

      {mostrarFifo ? (
        <p className="mb-2 text-[11px] text-text-faint">
          Embalagem por FIFO (lote sem OP).
        </p>
      ) : null}

      {!disponivel || itens.length === 0 ? (
        <p className="py-2 text-[12px] text-text-muted">
          Nenhuma OP no plano desta etapa.
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {itens.map((item) => (
            <FluxoOpRelogioRow key={item.ordemProducaoId} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
