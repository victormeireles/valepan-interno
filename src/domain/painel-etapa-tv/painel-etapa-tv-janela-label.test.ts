import { describe, expect, it } from 'vitest';
import { JanelaOperacionalResolver } from '@/domain/producao-turno/janela-operacional';
import { PainelEtapaTvJanelaLabel } from './painel-etapa-tv-janela-label';

describe('PainelEtapaTvJanelaLabel', () => {
  it('formata OP 2 set com turnos 22h de 1 set → 22h de 2 set', () => {
    const janela = new JanelaOperacionalResolver().forDate('2026-09-02', '22:00');
    expect(PainelEtapaTvJanelaLabel.format('2026-09-02', janela)).toBe(
      'OP 2 set · turnos 22h de 1 set → 22h de 2 set',
    );
  });
});
