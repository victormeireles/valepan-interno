import { describe, expect, it } from 'vitest';
import { FilaFundacao } from './fila-fundacao';

describe('FilaFundacao', () => {
  const fila = new FilaFundacao();

  it('avisa quando nenhum setor está liberado', () => {
    expect(fila.mensagem(false, 0)).toBe('Nenhum setor liberado.');
  });

  it('avisa que não há ordem quando há setores ou a visão é geral', () => {
    expect(fila.mensagem(false, 2)).toBe('Nenhuma ordem.');
    expect(fila.mensagem(true, 0)).toBe('Nenhuma ordem.');
  });
});
