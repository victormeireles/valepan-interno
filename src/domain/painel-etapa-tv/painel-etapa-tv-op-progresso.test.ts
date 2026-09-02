import { expect, it } from 'vitest';
import { JanelaOperacionalResolver } from '@/domain/producao-turno/janela-operacional';
import { PainelEtapaTvOpProgresso } from './painel-etapa-tv-op-progresso';

const janela = new JanelaOperacionalResolver().forDate('2026-09-02', '22:00');

it('lote da véspera 22h entra em feito e nesta janela', () => {
  const dto = PainelEtapaTvOpProgresso.fromLotes(
    [{ produzidoEm: '2026-09-01T22:30:00-03:00', volume: 10 }],
    100,
    janela,
  );
  expect(dto).toMatchObject({
    feito: 10, nestaJanela: 10, depoisJanela: 0, antesJanela: 0, falta: 90, meta: 100,
  });
});

it('lote depois do fim só em depoisJanela', () => {
  const dto = PainelEtapaTvOpProgresso.fromLotes(
    [{ produzidoEm: '2026-09-02T22:30:00-03:00', volume: 8 }],
    100,
    janela,
  );
  expect(dto.depoisJanela).toBe(8);
  expect(dto.nestaJanela).toBe(0);
  expect(dto.feito).toBe(8);
});

it('antes + nesta + depois = feito', () => {
  const dto = PainelEtapaTvOpProgresso.fromLotes(
    [
      { produzidoEm: '2026-09-01T21:00:00-03:00', volume: 1 },
      { produzidoEm: '2026-09-02T10:00:00-03:00', volume: 4 },
      { produzidoEm: '2026-09-02T23:00:00-03:00', volume: 2 },
    ],
    10,
    janela,
  );
  expect(dto.antesJanela + dto.nestaJanela + dto.depoisJanela).toBe(dto.feito);
  expect(dto.feito).toBe(7);
});
