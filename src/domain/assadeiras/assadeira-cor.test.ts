import { describe, expect, it } from 'vitest';
import { AssadeiraCor } from './assadeira-cor';

const cor = new AssadeiraCor();

describe('AssadeiraCor', () => {
  it('normaliza hex com ou sem # para #RRGGBB maiúsculo', () => {
    expect(cor.normalize('#c6a848')).toBe('#C6A848');
    expect(cor.normalize('6b7233')).toBe('#6B7233');
  });

  it('rejeita valores inválidos e devolve fallback', () => {
    expect(cor.normalize('')).toBe(AssadeiraCor.FALLBACK);
    expect(cor.normalize('#fff')).toBe(AssadeiraCor.FALLBACK);
    expect(cor.normalize('azul')).toBe(AssadeiraCor.FALLBACK);
    expect(cor.normalize(null)).toBe(AssadeiraCor.FALLBACK);
  });

  it('aceita apenas #RRGGBB na validação de cadastro', () => {
    expect(cor.isValid('#C6A848')).toBe(true);
    expect(cor.isValid('#c6a848')).toBe(true);
    expect(cor.isValid('C6A848')).toBe(false);
    expect(cor.isValid('#FFF')).toBe(false);
    expect(cor.isValid('#GGGGGG')).toBe(false);
  });

  it('monta mapa nome → cor a partir das linhas cadastradas', () => {
    const cores = cor.indexByNome([
      { nome: 'Bun', cor_hex: '#b45309' },
      { nome: '50g', cor_hex: 'invalida' },
    ]);
    expect(cores.Bun).toBe('#B45309');
    expect(cores['50g']).toBe(AssadeiraCor.FALLBACK);
  });

  it('devolve o mesmo visual para o mesmo hex', () => {
    const a = cor.visual('#6B7233');
    const b = cor.visual('#6b7233');
    expect(a.hex).toBe('#6B7233');
    expect(a).toEqual(b);
    expect(a.pill.color).toBe('#6B7233');
    expect(a.cssVar['--assadeira-cor']).toBe('#6B7233');
  });
});
