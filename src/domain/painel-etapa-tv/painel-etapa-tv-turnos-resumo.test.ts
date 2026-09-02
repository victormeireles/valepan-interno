import { describe, expect, it } from 'vitest';
import { PainelEtapaTvTurnosResumo } from './painel-etapa-tv-turnos-resumo';

it('soma pelo carimbo, não pelo relógio, no overlap T2/T3', () => {
  const dto = PainelEtapaTvTurnosResumo.fromEventos(
    [
      { volume: 10, turno: 2, dataOp: '2026-09-02' },
      { volume: 7, turno: 3, dataOp: '2026-09-02' },
    ],
    '2026-09-02',
    [
      { numero: 1, inicio: '22:00', fim: '07:00' },
      { numero: 2, inicio: '07:00', fim: '16:00' },
      { numero: 3, inicio: '13:00', fim: '22:00' },
    ],
  );
  expect(dto.fatias.find((f) => f.numero === 2)?.volume).toBe(10);
  expect(dto.fatias.find((f) => f.numero === 3)?.volume).toBe(7);
  expect(dto.total).toBe(17);
});

it('outra OP com uma data vira outraOpData', () => {
  const dto = PainelEtapaTvTurnosResumo.fromEventos(
    [
      { volume: 5, turno: 1, dataOp: '2026-09-02' },
      { volume: 3, turno: 1, dataOp: '2026-09-01' },
    ],
    '2026-09-02',
    [{ numero: 1, inicio: '22:00', fim: '07:00' }],
  );
  expect(dto.outraOp).toBe(3);
  expect(dto.outraOpData).toBe('2026-09-01');
});

it('duas datas outras → outraOpData null', () => {
  const dto = PainelEtapaTvTurnosResumo.fromEventos(
    [
      { volume: 1, turno: 1, dataOp: '2026-09-01' },
      { volume: 1, turno: 1, dataOp: '2026-08-31' },
    ],
    '2026-09-02',
    [{ numero: 1, inicio: '22:00', fim: '07:00' }],
  );
  expect(dto.outraOp).toBe(2);
  expect(dto.outraOpData).toBeNull();
});
