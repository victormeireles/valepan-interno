import { describe, expect, it } from 'vitest';
import {
  getInsumoHistoricoPresetRange,
  toInsumoHistoricoIsoRange,
} from './insumo-historico-periodo';

const agora = new Date('2026-08-18T15:30:00-03:00');

describe('getInsumoHistoricoPresetRange', () => {
  it('hoje usa o dia civil atual', () => {
    expect(getInsumoHistoricoPresetRange('hoje', agora)).toEqual({
      de: '2026-08-18',
      ate: '2026-08-18',
    });
  });

  it('ontem usa o dia civil anterior', () => {
    expect(getInsumoHistoricoPresetRange('ontem', agora)).toEqual({
      de: '2026-08-17',
      ate: '2026-08-17',
    });
  });

  it('3dias cobre hoje e os dois dias anteriores', () => {
    expect(getInsumoHistoricoPresetRange('3dias', agora)).toEqual({
      de: '2026-08-16',
      ate: '2026-08-18',
    });
  });
});

describe('toInsumoHistoricoIsoRange', () => {
  it('usa meia-noite e fim do dia no fuso de Brasília', () => {
    expect(toInsumoHistoricoIsoRange('2026-08-18', '2026-08-18')).toEqual({
      createdAtDe: '2026-08-18T00:00:00.000-03:00',
      createdAtAte: '2026-08-18T23:59:59.999-03:00',
    });
  });
});
