import { describe, expect, it } from 'vitest';
import { FaltaAgrupamento } from './falta-agrupamento';

describe('FaltaAgrupamento', () => {
  it('junta as faltas ativas de cada pessoa', () => {
    const linhas = new FaltaAgrupamento().porPessoa([
      { codigo: 'VP-2', nome: 'Bia', cancelada: false, setorNome: 'Forno', turnoNome: 'Noite', situacao: 'desligado', avisoAtivo: false },
      { codigo: 'VP-1', nome: 'Ana', cancelada: false, setorNome: 'Embalagem', turnoNome: 'Manhã', situacao: 'ativo', avisoAtivo: true },
      { codigo: 'VP-1', nome: 'Ana', cancelada: false, setorNome: 'Embalagem', turnoNome: 'Manhã', situacao: 'ativo', avisoAtivo: true },
      { codigo: 'VP-1', nome: 'Ana', cancelada: true, setorNome: 'Embalagem', turnoNome: 'Manhã', situacao: 'ativo', avisoAtivo: true },
    ]);
    expect(linhas).toEqual([
      { codigo: 'VP-1', nome: 'Ana', faltas: 2, setorNome: 'Embalagem', turnoNome: 'Manhã', situacao: 'ativo', avisoAtivo: true },
      { codigo: 'VP-2', nome: 'Bia', faltas: 1, setorNome: 'Forno', turnoNome: 'Noite', situacao: 'desligado', avisoAtivo: false },
    ]);
  });
});
