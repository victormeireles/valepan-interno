'use client';

import {
  deveExibirAtalhoSaldoRestante,
  formatarRotuloAtalhoLote,
  type ProducaoLoteAtalhoUnidade,
} from '@/domain/realizado/producao-lote-atalhos';

type Props = {
  lotePadrao: number;
  saldoRestante: number;
  unidade: ProducaoLoteAtalhoUnidade;
  disabled?: boolean;
  placement?: 'inline' | 'below';
  onPreencherPadrao: () => void;
  onPreencherRestante: () => void;
};

const atalhoBtnBase =
  'shrink-0 min-h-11 rounded-md px-2.5 py-2 text-sm font-medium disabled:opacity-50';

const placementClass: Record<'inline' | 'below', string> = {
  inline: 'ml-1 flex shrink-0 items-center gap-1',
  below: 'mt-3 flex flex-wrap items-center gap-2',
};

export default function ProducaoLoteAtalhosButtons({
  lotePadrao,
  saldoRestante,
  unidade,
  disabled = false,
  placement = 'inline',
  onPreencherPadrao,
  onPreencherRestante,
}: Props) {
  const mostrarRestante = deveExibirAtalhoSaldoRestante(saldoRestante, lotePadrao);

  return (
    <div className={placementClass[placement]}>
      <button
        type="button"
        onClick={onPreencherPadrao}
        disabled={disabled}
        className={`${atalhoBtnBase} border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100`}
      >
        {formatarRotuloAtalhoLote(lotePadrao, unidade)}
      </button>
      {mostrarRestante ? (
        <button
          type="button"
          onClick={onPreencherRestante}
          disabled={disabled}
          className={`${atalhoBtnBase} border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100`}
        >
          {formatarRotuloAtalhoLote(saldoRestante, unidade)}
        </button>
      ) : null}
    </div>
  );
}
