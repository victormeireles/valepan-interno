import { describe, expect, it } from 'vitest';
import type { ReclamacaoCategoriaRecord } from '@/domain/reclamacoes/reclamacao-types';
import {
  categoriasDoFiltro,
  categoriasDoSelect,
  idPorNome,
  opcoesDoSelect,
} from './reclamacao-form-options';

const mofado: ReclamacaoCategoriaRecord = {
  id: 'k1',
  nome: 'Mofado',
  ordem: 1,
  ativa: true,
  exigeObservacao: false,
};

const outros: ReclamacaoCategoriaRecord = {
  id: 'k2',
  nome: 'Outros',
  ordem: 2,
  ativa: false,
  exigeObservacao: true,
};

describe('reclamacao-form-options', () => {
  it('no edit inclui a categoria atual se estiver inativa', () => {
    expect(categoriasDoSelect({ ativas: [mofado], atual: outros })).toEqual([
      mofado,
      outros,
    ]);
    expect(categoriasDoSelect({ ativas: [mofado] })).toEqual([mofado]);
  });

  it('no filtro une ativas com categorias já listadas', () => {
    expect(
      categoriasDoFiltro(
        [{ id: 'k1', nome: 'Mofado' }],
        [{ categoriaId: 'k2', categoriaNome: 'Outros' }],
      ),
    ).toEqual([
      { id: 'k1', nome: 'Mofado' },
      { id: 'k2', nome: 'Outros' },
    ]);
  });

  it('resolve id pelo nome exato', () => {
    expect(idPorNome([{ id: 'c1', nome: 'Chef+' }], 'Chef+')).toBe('c1');
    expect(idPorNome([{ id: 'c1', nome: 'Chef+' }], 'outro')).toBe('');
  });

  it('no edit inclui cliente ou produto atual se estiver inativo', () => {
    const ativos = [{ id: 'c1', nome: 'Chef+' }];
    const inativo = { id: 'c2', nome: 'Padaria velha' };
    expect(opcoesDoSelect(ativos, inativo)).toEqual([...ativos, inativo]);
    expect(opcoesDoSelect(ativos, { id: 'c1', nome: 'Chef+' })).toEqual(ativos);
    expect(opcoesDoSelect(ativos, null)).toEqual(ativos);
  });
});
