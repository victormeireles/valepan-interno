import { describe, expect, it } from 'vitest';
import type { FolhaPacote } from './folha-balde';
import { FolhaVigente } from './folha-vigente';

const pacote: FolhaPacote = {
  salarioCentavos: 100_000,
  valeTransporteCentavos: 20_000,
  valeAlimentacaoCentavos: 30_000,
  planoSaude: true,
};

describe('FolhaVigente', () => {
  const vigente = new FolhaVigente();

  it('fica com o início mais recente até hoje e ignora o futuro', () => {
    const mapa = vigente.porPessoa(
      [
        { colaboradorId: 'a', inicio: '2026-01-01', ...pacote, salarioCentavos: 1 },
        { colaboradorId: 'a', inicio: '2026-03-01', ...pacote },
        { colaboradorId: 'a', inicio: '2026-06-01', ...pacote, salarioCentavos: 9 },
        { colaboradorId: 'b', inicio: '2026-07-01', ...pacote },
      ],
      '2026-04-15',
    );
    expect(mapa.get('a')?.salarioCentavos).toBe(100_000);
    expect(mapa.has('b')).toBe(false);
  });

  it('pessoa só com data futura fica sem pacote', () => {
    const mapa = vigente.porPessoa([{ colaboradorId: 'a', inicio: '2026-06-01', ...pacote }], '2026-04-15');
    expect(mapa.size).toBe(0);
  });
});
