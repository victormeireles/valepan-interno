import type { FluxoEtapaKey, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import {
  JanelaOperacionalResolver,
  type JanelaOperacional,
} from '@/domain/producao-turno/janela-operacional';

const CIVIL_T1 = '00:00';
const resolver = new JanelaOperacionalResolver();

/** Eixo 24h a partir do T1 da etapa; sem janela → eixo civil 00–23. */
export class FluxoHoraEixo {
  constructor(
    private readonly fluxo: VpFluxoPayload,
    private readonly etapa: FluxoEtapaKey,
  ) {}

  t1Inicio(): string {
    return this.janelaAnexa()?.t1Inicio ?? CIVIL_T1;
  }

  hoursAxis(): number[] {
    return resolver.hoursAxis(this.t1Inicio());
  }

  mostrarAgora(nowMs = Date.now()): boolean {
    const janela = this.janelaAnexa();
    if (!janela) return false;
    return resolver.contains(nowMs, janela);
  }

  private janelaAnexa(): JanelaOperacional | undefined {
    return this.fluxo.janelasPorEtapa?.[this.etapa];
  }
}
