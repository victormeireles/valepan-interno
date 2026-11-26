import { describe, expect, it } from 'vitest';
import { SugestaoFotoRegra } from './sugestao-foto-regra';
import { SugestaoTemaCatalogo } from './sugestao-tema-catalogo';
import { SugestaoTextoRegra } from './sugestao-texto-regra';

describe('regras da sugestão', () => {
  const temas = new SugestaoTemaCatalogo();
  const texto = new SugestaoTextoRegra();
  const foto = new SugestaoFotoRegra();

  it('aceita os sete temas e rejeita outro', () => {
    expect(temas.opcoes().map((item) => item.valor)).toEqual([
      'seguranca', 'qualidade', 'organizacao', 'processos',
      'eficiencia', 'seguranca_alimentos', 'inovacao',
    ]);
    expect(temas.rotulo('seguranca_alimentos')).toBe('Segurança dos alimentos');
    expect(temas.aceita('inovacao')).toBe(true);
    expect(temas.aceita('outro')).toBe(false);
  });

  it('corta o texto e cobra de 10 a 2000', () => {
    expect(texto.avaliar('a'.repeat(9))).toEqual({
      ok: false,
      mensagem: 'Escreva pelo menos 10 caracteres.',
    });
    expect(texto.avaliar(`  ${'a'.repeat(10)}  `)).toEqual({ ok: true, texto: 'a'.repeat(10) });
    expect(texto.avaliar('a'.repeat(2000))).toEqual({ ok: true, texto: 'a'.repeat(2000) });
    expect(texto.avaliar('a'.repeat(2001)).ok).toBe(false);
  });

  it('aceita foto ausente e jpeg, png ou webp até 5 MB', () => {
    expect(foto.avaliar(null)).toEqual({ ok: true, arquivo: null });
    expect(foto.avaliar({ type: 'image/png', size: 10, bytes: new Uint8Array([1]) }).ok).toBe(true);
    expect(foto.avaliar({ type: 'image/gif', size: 10, bytes: new Uint8Array([1]) })).toEqual({
      ok: false,
      mensagem: 'Use uma foto de até 5 MB.',
    });
    expect(foto.avaliar({ type: 'image/jpeg', size: 5_242_881, bytes: new Uint8Array([1]) }).ok).toBe(false);
  });
});
