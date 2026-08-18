import { formatJanelaRange } from './painel-producao-time';
import type { PainelProducaoAreaId } from './painel-producao-types';
import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';

export type PainelProducaoAreaWindow = {
  janelaIni: string;
  janelaFim: string;
  janela: string;
};

export function windowsFromConfig(
  snapshot: ConfigOperacaoSnapshot,
): Record<PainelProducaoAreaId, PainelProducaoAreaWindow> {
  return {
    ferm: {
      janelaIni: snapshot.horarioInicioProducao,
      janelaFim: snapshot.horarioFimProducao,
      janela: formatJanelaRange(
        snapshot.horarioInicioProducao,
        snapshot.horarioFimProducao,
      ),
    },
    forno: {
      janelaIni: snapshot.horarioInicioForno,
      janelaFim: snapshot.horarioFimForno,
      janela: formatJanelaRange(snapshot.horarioInicioForno, snapshot.horarioFimForno),
    },
    emb: {
      janelaIni: snapshot.horarioInicioEmbalagem,
      janelaFim: snapshot.horarioFimEmbalagem,
      janela: formatJanelaRange(
        snapshot.horarioInicioEmbalagem,
        snapshot.horarioFimEmbalagem,
      ),
    },
  };
}
