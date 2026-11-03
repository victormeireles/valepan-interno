'use client';

import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import { PainelAcao } from './PainelAcao';
import { RemuneracaoSecao } from './RemuneracaoSecao';

export function RemuneracaoPainel({
  pessoa,
  onFechar,
  onConcluir,
}: {
  pessoa: ColaboradorListaItem | null;
  onFechar: () => void;
  onConcluir: (mensagem: string, ok: boolean) => void;
}) {
  return (
    <PainelAcao aberto={pessoa !== null} titulo={pessoa?.nome ?? 'Remuneração'} onFechar={onFechar} largo>
      {pessoa ? <RemuneracaoSecao key={pessoa.codigo} codigo={pessoa.codigo} onConcluir={onConcluir} /> : null}
    </PainelAcao>
  );
}
