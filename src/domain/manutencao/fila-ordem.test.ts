import { describe, expect, it } from 'vitest';
import { FilaOrdem, type FilaItem } from './fila-ordem';

function item(
  numero: number,
  tipo: FilaItem['tipo'],
  urgencia: string | null,
  abertaEm: string,
  status: FilaItem['status'] = 'aberta',
  fimEm: string | null = null,
): FilaItem {
  return { numero, tipo, urgencia, status, abertaEm, fimEm };
}

describe('FilaOrdem', () => {
  const fila = new FilaOrdem();

  it('ordena por urgência e, no grupo, da mais antiga para a mais nova', () => {
    const itens = [
      item(1, 'preventiva', null, '2026-11-09T08:00:00-03:00'),
      item(2, 'corretiva', 'trabalhando_com_problema', '2026-11-09T10:00:00-03:00'),
      item(3, 'corretiva', 'maquina_parou', '2026-11-09T08:00:00-03:00', 'recebida'),
      item(4, 'corretiva', 'oferecendo_risco', '2026-11-09T09:00:00-03:00'),
      item(5, 'corretiva', 'maquina_parou', '2026-11-09T10:00:00Z'),
      item(6, 'corretiva', 'trabalhando_com_problema', '2026-11-09T06:00:00-03:00', 'recebida'),
      item(7, 'preventiva', null, '2026-11-09T11:00:00-03:00', 'recebida'),
      item(8, 'corretiva', 'oferecendo_risco', '2026-11-09T08:30:00-03:00'),
    ];

    const ordenados = fila.ordenar(itens).map((linha) => linha.numero);

    expect(ordenados).toEqual([5, 3, 8, 4, 6, 2, 1, 7]);
  });

  it('mantém finalizadas depois das abertas e recebidas, da mais nova para a mais antiga', () => {
    const itens = [
      item(10, 'corretiva', 'maquina_parou', '2026-11-08T08:00:00-03:00', 'finalizada', '2026-11-08T12:00:00-03:00'),
      item(11, 'corretiva', 'maquina_parou', '2026-11-09T08:00:00-03:00'),
      item(12, 'corretiva', 'oferecendo_risco', '2026-11-07T08:00:00-03:00', 'finalizada', '2026-11-09T18:00:00-03:00'),
    ];

    const ordenados = fila.ordenar(itens).map((linha) => linha.numero);

    expect(ordenados).toEqual([11, 12, 10]);
  });
});
