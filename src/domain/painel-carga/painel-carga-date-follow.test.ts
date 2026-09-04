import { describe, expect, it } from 'vitest';
import { PainelCargaDateFollow } from './painel-carga-date-follow';

describe('PainelCargaDateFollow', () => {
  it('não mexe na data se o operador escolheu no seletor', () => {
    expect(
      PainelCargaDateFollow.nextDate({
        userPickedDate: true,
        ultimaDataComDados: '2026-09-03',
        selectedDate: '2026-09-04',
      }),
    ).toBeNull();
  });

  it('não mexe quando a última data já é a selecionada', () => {
    expect(
      PainelCargaDateFollow.nextDate({
        userPickedDate: false,
        ultimaDataComDados: '2026-09-04',
        selectedDate: '2026-09-04',
      }),
    ).toBeNull();
  });

  it('segue a última data com dados no refresh automático', () => {
    expect(
      PainelCargaDateFollow.nextDate({
        userPickedDate: false,
        ultimaDataComDados: '2026-09-04',
        selectedDate: '2026-09-03',
      }),
    ).toBe('2026-09-04');
  });

  it('ignora última data vazia', () => {
    expect(
      PainelCargaDateFollow.nextDate({
        userPickedDate: false,
        ultimaDataComDados: '  ',
        selectedDate: '2026-09-04',
      }),
    ).toBeNull();
  });
});
