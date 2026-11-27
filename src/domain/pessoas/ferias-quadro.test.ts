import { describe, expect, it } from 'vitest';
import { FeriasQuadro } from './ferias-quadro';
import { QuadroOcupacao } from './quadro-ocupacao';

describe('FeriasQuadro', () => {
  const quadro = new FeriasQuadro();
  const gozo = { inicio: '2026-12-01', volta: '2026-12-31' };

  it('conta ocupação em gozo e deixa apoio e férias futuras de fora', () => {
    expect(
      quadro.contar(
        [
          { papel: 'ocupacao', ferias: gozo },
          { papel: 'ocupacao', ferias: { inicio: '2026-12-20', volta: '2027-01-10' } },
          { papel: 'apoio', ferias: gozo },
          { papel: 'ocupacao', ferias: { ...gozo, canceladaEm: '2026-12-02' } },
          { papel: 'ocupacao', ferias: null },
        ],
        '2026-12-10',
      ),
    ).toBe(1);
  });

  it('antes do início a contagem fica zerada', () => {
    expect(quadro.contar([{ papel: 'ocupacao', ferias: gozo }], '2026-11-26')).toBe(0);
  });

  it('escreve a nota sem mexer em contratados e vagas livres', () => {
    const numeros = {
      aprovado: 14,
      contratados: 12,
      reservas: 0,
      afastados: 0,
      avisos: 0,
      livres: 2,
      ferias: 3,
    };
    expect(quadro.nota(numeros)).toBe('3 em férias. No posto: 9. A vaga continua de cada um.');
    expect(quadro.nota({ ...numeros, ferias: 1 })).toBe('1 em férias. No posto: 11. A vaga continua da pessoa.');
    expect(new QuadroOcupacao().segmentos(numeros)).toMatchObject({
      noPosto: 9,
      ferias: 3,
      livres: 2,
      livresAposSaidas: 2,
    });
  });
});
