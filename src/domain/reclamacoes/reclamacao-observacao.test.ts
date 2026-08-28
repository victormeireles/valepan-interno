import { describe, expect, it } from 'vitest';
import {
  assertObservacaoCategoria,
  normalizarObservacao,
} from './reclamacao-observacao';

describe('reclamacao-observacao', () => {
  it('trim vira null quando vazio', () => {
    expect(normalizarObservacao('  ')).toBeNull();
    expect(normalizarObservacao(null)).toBeNull();
    expect(normalizarObservacao('não pincelado')).toBe('não pincelado');
  });

  it('exige texto quando a categoria pede', () => {
    expect(assertObservacaoCategoria(true, null)).toBe('Descreva o problema.');
    expect(assertObservacaoCategoria(true, 'mofo na lateral')).toBeNull();
    expect(assertObservacaoCategoria(false, null)).toBeNull();
  });
});
