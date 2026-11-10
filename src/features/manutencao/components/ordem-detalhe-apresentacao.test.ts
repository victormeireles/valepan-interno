import { describe, expect, it } from 'vitest';
import { apresentacaoOrdem } from './ordem-detalhe-apresentacao';

describe('apresentacaoOrdem', () => {
  it('formata o número da ordem', () => {
    expect(apresentacaoOrdem.numero(1)).toBe('OS-00001');
  });
});
