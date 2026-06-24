'use client';

import type { InsumoPendenciaGrupoContexto } from '@/domain/insumos/insumo-pendencia-grupo-contexto';

type Props = {
  empresaNome: string;
  contexto: InsumoPendenciaGrupoContexto;
};

export default function InsumoPendenciaFornecedorCell({ empresaNome, contexto }: Props) {
  const semDados = contexto.fornecedoresDistintos === 0;

  return (
    <div className="min-w-0">
      <p
        className={[
          'truncate text-sm',
          semDados ? 'text-stone-400 italic' : 'font-medium text-stone-900',
        ].join(' ')}
        title={contexto.fornecedorTitulo}
      >
        {contexto.fornecedorTitulo}
      </p>
      {contexto.fornecedorSubtitulo ? (
        <p className="mt-0.5 truncate text-xs text-stone-500" title={contexto.fornecedorSubtitulo}>
          {contexto.fornecedorSubtitulo}
        </p>
      ) : null}
      <p className="mt-1 truncate text-xs text-stone-400">{empresaNome}</p>
    </div>
  );
}
