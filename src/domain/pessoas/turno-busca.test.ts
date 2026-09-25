import { describe, expect, it } from 'vitest';
import { TurnoBusca } from './turno-busca';

describe('TurnoBusca', () => {
  const turnos = [
    { codigo: 'B', nome: 'Manhã', setorNome: 'Produção' },
    { codigo: 'A', nome: '04:00-13:00', setorNome: 'Produção' },
    { codigo: 'C', nome: 'Manhã', setorNome: 'Embalagem' },
  ];

  it('ordena por setor e turno e filtra o texto', () => {
    const busca = new TurnoBusca();
    expect(busca.listar(turnos, '').map((turno) => turno.codigo)).toEqual(['C', 'A', 'B']);
    expect(busca.listar(turnos, 'produ manha').map((turno) => turno.codigo)).toEqual(['B']);
  });
});
