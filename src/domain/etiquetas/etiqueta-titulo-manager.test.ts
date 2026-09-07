import { describe, expect, it } from 'vitest';
import { EtiquetaTituloManager } from './etiqueta-titulo-manager';

describe('EtiquetaTituloManager', () => {
  const manager = new EtiquetaTituloManager();
  const produto = { nome: 'Produto', nomeEtiqueta: 'Nome antigo', familiaNome: 'Hot Dog Big' };

  it('prioriza edição, família, nome da etiqueta e nome do produto', () => {
    expect(manager.resolve(produto, 'Personalizado')).toBe('Personalizado');
    expect(manager.resolve(produto)).toBe('Hot Dog Big');
    expect(manager.resolve({ ...produto, familiaNome: null })).toBe('Nome antigo');
    expect(manager.resolve({ nome: 'Produto' })).toBe('Produto');
  });

  it('normaliza espaços e ignora edições vazias', () => {
    expect(manager.resolve(produto, '  Brioche \n Gergelim   Duo  ')).toBe('Brioche Gergelim Duo');
    expect(manager.resolve(produto, '  ')).toBe('Hot Dog Big');
  });

  it.each([
    ['Hot Dog Big', 'Hot Dog', 'Big'],
    ['Brioche Gergelim Duo', 'Brioche Gergelim', 'Duo'],
    ['Pão com Gergelim', 'Pão com', 'Gergelim'],
    ['Podrão', '', 'Podrão'],
    ['  Mini  Brioche Bun Cortado  ', 'Mini Brioche Bun', 'Cortado'],
  ])('destaca a última palavra de %s', (titulo, prefixo, destaque) => {
    expect(manager.split(titulo)).toEqual({ prefixo, destaque });
  });
});
