import type { FluxoEtapaKey } from '@/domain/fluxo-processo/fluxo-processo-types';
import {
  controleVolumeOp,
  type FluxoControleUnidade,
} from './fluxo-controle-op-volume';
import { janelaPrevista } from './fluxo-controle-janela';
import type { FluxoControleOpInput } from './fluxo-controle-types';

export class FluxoPrevistoAcumulado {
  volumeOp(
    op: FluxoControleOpInput,
    etapa: FluxoEtapaKey,
    asOfMs: number,
    unidade: FluxoControleUnidade,
  ): number {
    const { ini, fim } = janelaPrevista(op, etapa);
    const t = asOfMs;
    const unidades = controleVolumeOp(op, unidade, etapa);

    if (fim === ini) {
      return t >= ini ? unidades : 0;
    }

    if (t <= ini) {
      return 0;
    }

    if (t >= fim) {
      return unidades;
    }

    return unidades * ((t - ini) / (fim - ini));
  }

  somaEtapa(
    ops: FluxoControleOpInput[],
    etapa: FluxoEtapaKey,
    asOfMs: number,
    unidade: FluxoControleUnidade,
  ): number {
    return ops.reduce(
      (total, op) => total + this.volumeOp(op, etapa, asOfMs, unidade),
      0,
    );
  }
}
