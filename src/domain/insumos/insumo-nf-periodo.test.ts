import { describe, expect, it } from 'vitest';
import {
  getInsumoNfPresetRange,
  toInsumoNfIsoRange,
} from '@/domain/insumos/insumo-nf-periodo';

describe('getInsumoNfPresetRange', () => {
  it('últimos 7 dias inclui hoje e 6 dias anteriores', () => {
    const agora = new Date('2026-09-15T18:00:00-03:00');
    expect(getInsumoNfPresetRange('7dias', agora)).toEqual({
      de: '2026-09-09',
      ate: '2026-09-15',
    });
  });

  it('últimos 30 dias inclui hoje e 29 dias anteriores', () => {
    const agora = new Date('2026-09-15T18:00:00-03:00');
    expect(getInsumoNfPresetRange('30dias', agora)).toEqual({
      de: '2026-08-17',
      ate: '2026-09-15',
    });
  });
});

describe('toInsumoNfIsoRange', () => {
  it('fecha o intervalo no fuso de Brasília', () => {
    expect(toInsumoNfIsoRange('2026-09-09', '2026-09-15')).toEqual({
      inicioIso: '2026-09-09T00:00:00.000-03:00',
      fimIso: '2026-09-15T23:59:59.999-03:00',
    });
  });
});
