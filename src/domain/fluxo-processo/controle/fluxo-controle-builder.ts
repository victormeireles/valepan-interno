import { emptyMatrizEtapas } from '@/domain/fluxo-processo/fluxo-matriz-horaria';
import type { FluxoEtapaKey } from '@/domain/fluxo-processo/fluxo-processo-types';
import { controleVolumeOp } from './fluxo-controle-op-volume';
import { FluxoControleStatus } from './fluxo-controle-status';
import type {
  FluxoControleBuilderInput,
  FluxoControleDia,
  FluxoControleEtapaNumeros,
  FluxoOpRelogioItem,
} from './fluxo-controle-types';
import { FluxoOpRelogio } from './fluxo-op-relogio';
import { FluxoPrevistoAcumulado } from './fluxo-previsto-acumulado';
import { FluxoPrevistoHora } from './fluxo-previsto-hora';

export class FluxoControleBuilder {
  private readonly acumulado = new FluxoPrevistoAcumulado();
  private readonly hora = new FluxoPrevistoHora();
  private readonly status = new FluxoControleStatus();
  private readonly relogio = new FluxoOpRelogio();

  build(input: FluxoControleBuilderInput): FluxoControleDia {
    if (input.ops.length === 0) {
      return this.buildIndisponivel(input.ordemAss);
    }

    const etapas = this.buildEtapas(input);
    return {
      disponivel: true,
      etapas,
      matrizPrevisto: this.hora.buildMatriz(input.ops, input.ordemAss, input.dateISO),
      relogio: this.buildRelogio(input),
      embalagemFifo: true,
    };
  }

  private buildIndisponivel(ordemAss: string[]): FluxoControleDia {
    const zero = () => this.status.numeros(0, 0, 0);
    return {
      disponivel: false,
      etapas: { ferm: zero(), forno: zero(), emb: zero() },
      matrizPrevisto: emptyMatrizEtapas(ordemAss),
      relogio: { ferm: [], forno: [], emb: [] },
      embalagemFifo: true,
    };
  }

  private buildEtapas(
    input: FluxoControleBuilderInput,
  ): Record<FluxoEtapaKey, FluxoControleEtapaNumeros> {
    return {
      ferm: this.numerosEtapa(input, 'ferm'),
      forno: this.numerosEtapa(input, 'forno'),
      emb: this.numerosEtapa(input, 'emb'),
    };
  }

  private numerosEtapa(
    input: FluxoControleBuilderInput,
    key: FluxoEtapaKey,
  ): FluxoControleEtapaNumeros {
    const objetivoLt = input.ops.reduce(
      (s, op) => s + controleVolumeOp(op, 'lt', key),
      0,
    );
    const objetivoCx = input.ops.reduce(
      (s, op) => s + controleVolumeOp(op, 'cx', key),
      0,
    );
    const fechado = input.dateISO !== input.todayISO;
    const deveriaLt = fechado
      ? objetivoLt
      : this.acumulado.somaEtapa(input.ops, key, input.asOfMs, 'lt');
    const deveriaCx = fechado
      ? objetivoCx
      : this.acumulado.somaEtapa(input.ops, key, input.asOfMs, 'cx');
    const operacional = key === 'emb'
      ? { objetivo: objetivoCx, deveria: deveriaCx }
      : { objetivo: objetivoLt, deveria: deveriaLt };
    const estaUn =
      key === 'emb'
        ? Math.max(0, input.etapasVol.emb - input.opAnteriorVol)
        : input.etapasVol[key];
    return {
      ...this.status.numeros(operacional.objetivo, operacional.deveria, estaUn),
      objetivoLt,
      deveriaLt,
      objetivoCx,
      deveriaCx,
    };
  }

  private buildRelogio(
    input: FluxoControleBuilderInput,
  ): Record<FluxoEtapaKey, FluxoOpRelogioItem[]> {
    const embDoDia = input.eventos.emb.filter((e) => e.dataOp === input.dateISO);
    return {
      ferm: this.relogio.porLote(input.ops, input.eventos.ferm, 'ferm'),
      forno: this.relogio.porLote(input.ops, input.eventos.forno, 'forno'),
      emb: this.relogio.porFifoEmbalagem(input.ops, embDoDia),
    };
  }
}
