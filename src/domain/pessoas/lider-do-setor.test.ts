import { describe, expect, it } from 'vitest';
import { LiderDoSetor } from './lider-do-setor';

describe('LiderDoSetor', () => {
  it('agrupa o nome de quem lidera o setor e ignora desligado', () => {
    const lideres = new LiderDoSetor().porSetor([
      { nome: 'Ana', setorNome: 'Forno', liderSetor: true, situacao: 'ativo' },
      { nome: 'Bruno', setorNome: 'Forno', liderSetor: false, situacao: 'ativo' },
      { nome: 'Carla', setorNome: 'Forno', liderSetor: true, situacao: 'desligado' },
      { nome: 'Duda', setorNome: null, liderSetor: true, situacao: 'ativo' },
    ]);

    expect(lideres.get('Forno')).toBe('Ana');
    expect(lideres.has('')).toBe(false);
  });
});
