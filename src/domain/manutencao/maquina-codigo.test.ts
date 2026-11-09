import { describe, expect, it } from 'vitest';
import { MaquinaCodigo } from './maquina-codigo';

describe('MaquinaCodigo', () => {
  const codigo = new MaquinaCodigo();

  it('normaliza com trim e monta a chave em minúsculas', () => {
    expect(codigo.normalizar('  Forno 01  ')).toBe('Forno 01');
    expect(codigo.chave('  Forno 01  ')).toBe('forno 01');
  });

  it('trata acento maiúsculo e minúsculo como a mesma chave', () => {
    expect(codigo.chave('  Á ')).toBe(codigo.chave('  á '));
  });

  it('preserva espaços internos', () => {
    expect(codigo.normalizar('Forno  01')).toBe('Forno  01');
  });
});
