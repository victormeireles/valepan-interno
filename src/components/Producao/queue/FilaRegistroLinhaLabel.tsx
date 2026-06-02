'use client';

import { formatarLinhaListaRegistroFila } from '@/lib/production/registro-adiantado-fila';

type FilaRegistroLinhaLabelProps = {
  rotuloExibicao: string;
  ehRegistroAdiantado?: boolean;
  latas?: number;
  bandejas?: number;
  className?: string;
};

export default function FilaRegistroLinhaLabel({
  rotuloExibicao,
  ehRegistroAdiantado = false,
  latas,
  bandejas,
  className = 'font-medium text-slate-900 tabular-nums',
}: FilaRegistroLinhaLabelProps) {
  const texto = formatarLinhaListaRegistroFila({
    rotuloExibicao,
    latas,
    bandejas,
    ehRegistroAdiantado,
  });
  return <span className={className}>{texto}</span>;
}
