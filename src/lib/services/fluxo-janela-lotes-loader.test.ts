import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG_OPERACAO } from '@/domain/config-operacao/config-operacao-mapper';
import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';

import { FluxoJanelaLotesLoader } from './fluxo-janela-lotes-loader';

const overnightTurnos: ConfigOperacaoSnapshot = {
  ...DEFAULT_CONFIG_OPERACAO,
  horarioInicioProducao: '00:00',
  horarioInicioForno: '04:00',
  horarioInicioEmbalagem: '07:00',
  turnos: [
    { etapa: 'fermentacao', numero: 1, inicio: '22:00', fim: '07:00' },
    { etapa: 'fermentacao', numero: 2, inicio: '07:00', fim: '16:00' },
    { etapa: 'fermentacao', numero: 3, inicio: '13:00', fim: '22:00' },
    { etapa: 'forno', numero: 1, inicio: '22:00', fim: '07:00' },
    { etapa: 'forno', numero: 2, inicio: '05:00', fim: '14:00' },
    { etapa: 'forno', numero: 3, inicio: '13:00', fim: '22:00' },
    { etapa: 'embalagem', numero: 1, inicio: '22:00', fim: '07:00' },
    { etapa: 'embalagem', numero: 2, inicio: '07:00', fim: '16:00' },
    { etapa: 'embalagem', numero: 3, inicio: '13:00', fim: '22:00' },
  ],
};

describe('FluxoJanelaLotesLoader.janelasPorEtapa', () => {
  it('origem da janela é o inicio do turno numero 1, não horarioInicio* nem o T2 do meio-dia', () => {
    const janelas = new FluxoJanelaLotesLoader().janelasPorEtapa(
      '2026-09-02',
      overnightTurnos,
    );

    expect(janelas.ferm.t1Inicio).toBe('22:00');
    expect(janelas.forno.t1Inicio).toBe('22:00');
    expect(janelas.emb.t1Inicio).toBe('22:00');
    expect(janelas.ferm.iniMs).toBe(brazilClockUtcMs('2026-09-01', '22:00'));
    expect(janelas.ferm.fimMs).toBe(brazilClockUtcMs('2026-09-02', '22:00'));
  });
});
