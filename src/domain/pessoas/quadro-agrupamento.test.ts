import { describe, expect, it } from 'vitest';
import { QuadroAgrupamento } from './quadro-agrupamento';

describe('QuadroAgrupamento', () => {
  it('agrupa o turno e deixa apoio fora da contagem', () => {
    const setores = new QuadroAgrupamento().agrupar(
      [
        {
          setorNome: 'Produção',
          turnoNome: 'Manhã',
          turnoCodigo: 'PRO-M',
          aprovado: 2,
          contratados: 1,
          reservas: 0,
          livres: 1,
        },
      ],
      [
        {
          codigo: 'VP-9001',
          nome: 'Ana',
          papel: 'ocupacao',
          lider: true,
          setorNome: 'Produção',
          turnoCodigo: 'PRO-M',
        },
        {
          codigo: 'VP-9002',
          nome: 'Lia',
          papel: 'apoio',
          lider: false,
          setorNome: 'Produção',
          turnoCodigo: 'AP-OPS',
        },
      ],
    );
    expect(setores[0]?.turnos[0]?.pessoas.map((p) => p.codigo)).toEqual(['VP-9001']);
    expect(setores[0]?.apoio.map((p) => p.codigo)).toEqual(['VP-9002']);
    expect(setores[0]?.liderNome).toBe('Ana');
  });
});
