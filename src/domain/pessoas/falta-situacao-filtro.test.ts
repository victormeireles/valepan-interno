import { describe, expect, it } from 'vitest';
import { FALTA_SITUACAO_PADRAO, FaltaSituacaoFiltro } from './falta-situacao-filtro';

const itens = [
  { codigo: 'ativo', situacao: 'ativo' as const, avisoAtivo: false },
  { codigo: 'aviso', situacao: 'ativo' as const, avisoAtivo: true },
  { codigo: 'posto', situacao: 'afastado' as const, avisoAtivo: true },
  { codigo: 'admissao', situacao: 'admissao_prevista' as const, avisoAtivo: false },
  { codigo: 'saiu', situacao: 'desligado' as const, avisoAtivo: false },
];

describe('FaltaSituacaoFiltro', () => {
  const filtro = new FaltaSituacaoFiltro();

  it('separa ativos de quem está em aviso', () => {
    expect(codigos(filtro.aplicar(itens, 'ativos'))).toEqual(['ativo']);
    expect(codigos(filtro.aplicar(itens, 'aviso'))).toEqual(['aviso']);
  });

  it('isola fora do posto, admissão prevista e desligados', () => {
    expect(codigos(filtro.aplicar(itens, 'fora_do_posto'))).toEqual(['posto']);
    expect(codigos(filtro.aplicar(itens, 'admissao_prevista'))).toEqual(['admissao']);
    expect(codigos(filtro.aplicar(itens, 'desligados'))).toEqual(['saiu']);
  });

  it('abre em todos', () => {
    expect(FALTA_SITUACAO_PADRAO).toBe('todos');
  });

  it('mantém todo mundo quando o filtro é todos', () => {
    expect(filtro.aplicar(itens, 'todos')).toHaveLength(5);
  });
});

function codigos(lista: { codigo: string }[]): string[] {
  return lista.map((item) => item.codigo);
}
