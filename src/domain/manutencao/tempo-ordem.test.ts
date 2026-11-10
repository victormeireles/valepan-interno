import { describe, expect, it } from 'vitest';
import { TempoOrdem } from './tempo-ordem';

describe('TempoOrdem', () => {
  const tempo = new TempoOrdem();

  it('conta a execução em minutos inteiros entre os instantes', () => {
    expect(
      tempo.execucaoMinutos(
        '2026-11-09T13:00:00-03:00',
        '2026-11-09T14:30:00-03:00',
      ),
    ).toBe(90);
  });

  it('compara o relógio de São Paulo mesmo com fusos diferentes', () => {
    expect(
      tempo.execucaoMinutos(
        '2026-11-09T16:00:00Z',
        '2026-11-09T14:30:00-03:00',
      ),
    ).toBe(90);
  });

  it('arredonda a execução para baixo, em minutos fechados', () => {
    expect(
      tempo.execucaoMinutos(
        '2026-11-09T13:00:00-03:00',
        '2026-11-09T13:00:59-03:00',
      ),
    ).toBe(0);
    expect(
      tempo.execucaoMinutos(
        '2026-11-09T13:00:00-03:00',
        '2026-11-09T13:01:59-03:00',
      ),
    ).toBe(1);
  });

  it('devolve a parada real quando a máquina parou', () => {
    expect(
      tempo.paradaMinutos(
        'maquina_parou',
        '2026-11-09T13:00:00-03:00',
        '2026-11-09T13:20:00-03:00',
      ),
    ).toBe(20);
  });

  it('zera a parada nas outras urgências', () => {
    expect(
      tempo.paradaMinutos(
        'oferecendo_risco',
        '2026-11-09T13:00:00-03:00',
        '2026-11-09T14:30:00-03:00',
      ),
    ).toBe(0);
    expect(
      tempo.paradaMinutos(
        'trabalhando_com_problema',
        '2026-11-09T13:00:00-03:00',
        '2026-11-09T14:30:00-03:00',
      ),
    ).toBe(0);
  });

  it('não valida fim antes do início e devolve os minutos absolutos', () => {
    expect(
      tempo.execucaoMinutos(
        '2026-11-09T14:30:00-03:00',
        '2026-11-09T13:00:00-03:00',
      ),
    ).toBe(90);
    expect(
      tempo.paradaMinutos(
        'maquina_parou',
        '2026-11-09T14:30:00-03:00',
        '2026-11-09T13:00:00-03:00',
      ),
    ).toBe(90);
  });
});
