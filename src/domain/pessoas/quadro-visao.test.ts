import { describe, expect, it } from 'vitest';
import { QuadroVisao } from './quadro-visao';

describe('QuadroVisao', () => {
  it('calcula livres sem contar apoio legado sem vaga', () => {
    const visao = new QuadroVisao().montar(
      [
        { setorNome: 'Produção', turnoNome: 'Manhã', turnoCodigo: 'PRO-M', operacional: true },
        { setorNome: 'Produção', turnoNome: 'Manhã', turnoCodigo: 'PRO-M', operacional: true },
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
        operacional: true,
        aprovado: 2,
        contratados: 1,
        reservas: 0,
        afastados: 0,
        livres: 1,
      },
    ]);
  });

  it('conta admissão prevista em a entrar e tira a vaga de livres', () => {
    const visao = new QuadroVisao().montar(
      Array.from({ length: 8 }, () => ({
        setorNome: 'Embalagem',
        turnoNome: 'Noite',
        turnoCodigo: 'EMB-N',
        operacional: true,
      })),
      [
        ...Array.from({ length: 7 }, () => ({
          setorNome: 'Embalagem',
          turnoNome: 'Noite',
          turnoCodigo: 'EMB-N',
          papel: 'ocupacao' as const,
        })),
        { setorNome: 'Embalagem', turnoNome: 'Noite', turnoCodigo: 'EMB-N', papel: 'reserva' },
      ],
    );
    expect(visao[0]).toMatchObject({ aprovado: 8, contratados: 7, reservas: 1, livres: 0 });
  });

  it('conta afastado no quadro e mantém a vaga livre', () => {
    const visao = new QuadroVisao().montar(
      Array.from({ length: 3 }, () => ({
        setorNome: 'Produção',
        turnoNome: 'Manhã',
        turnoCodigo: 'PRO-M',
        operacional: true,
      })),
      [
        { setorNome: 'Produção', turnoNome: 'Manhã', turnoCodigo: 'PRO-M', papel: 'ocupacao' },
        { setorNome: 'Produção', turnoNome: 'Manhã', turnoCodigo: 'PRO-M', papel: 'ocupacao' },
        { setorNome: 'Produção', turnoNome: 'Manhã', turnoCodigo: 'PRO-M', papel: 'afastado' },
      ],
    );
    expect(visao[0]).toMatchObject({ aprovado: 3, contratados: 2, afastados: 1, reservas: 0, livres: 1 });
  });
});
