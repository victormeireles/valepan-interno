import type { FluxoEtapaKey } from '@/domain/fluxo-processo/fluxo-processo-types';
import type { FluxoControleOpInput } from './fluxo-controle-types';

export type FluxoControleJanela = {
  ini: number;
  fim: number;
};

export function janelaPrevista(op: FluxoControleOpInput, etapa: FluxoEtapaKey): FluxoControleJanela {
  switch (etapa) {
    case 'ferm':
      return {
        ini: Date.parse(op.fermentacaoInicioPrevisto),
        fim: Date.parse(op.fermentacaoFimPrevisto),
      };
    case 'forno':
      return {
        ini: Date.parse(op.fornoInicioPrevisto),
        fim: Date.parse(op.fornoFimPrevisto),
      };
    case 'emb':
      return {
        ini: Date.parse(op.embalagemInicioPrevisto),
        fim: Date.parse(op.embalagemFimPrevisto),
      };
  }
}
