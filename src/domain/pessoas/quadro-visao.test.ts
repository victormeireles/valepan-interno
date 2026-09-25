import { describe, expect, it } from 'vitest';
import { QuadroVisao } from './quadro-visao';

describe('QuadroVisao', () => {
  it('calcula livres sem contar apoio', () => {
    const visao = new QuadroVisao().montar(
      [
        { setorNome: 'Produção', turnoNome: 'Manhã', turnoCodigo: 'PRO-M' },
        { setorNome: 'Produção', turnoNome: 'Manhã', turnoCodigo: 'PRO-M' },
      ],
      [
        { setorNome: 'Produção', turnoNome: 'Manhã', turnoCodigo: 'PRO-M', papel: 'ocupacao' },
        { setorNome: 'Operações', turnoNome: 'Apoio', turnoCodigo: 'AP-OPS', papel: 'apoio' },
      ],
    );
    expect(visao).toEqual([
      {
        setorNome: 'Produção',
        turnoNome: 'Manhã',
        turnoCodigo: 'PRO-M',
        aprovado: 2,
        contratados: 1,
        reservas: 0,
        livres: 1,
      },
    ]);
  });
});
