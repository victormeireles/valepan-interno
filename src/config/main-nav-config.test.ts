import { describe, expect, it } from 'vitest';
import {
  MAIN_NAV_ENTRIES,
  type MainNavGroup,
} from '@/config/main-nav-config';

function groupById(id: string): MainNavGroup {
  const entry = MAIN_NAV_ENTRIES.find(
    (item) => item.type === 'group' && item.id === id,
  );
  if (!entry || entry.type !== 'group') {
    throw new Error(`Grupo de navegação não encontrado: ${id}`);
  }
  return entry;
}

function groupHrefs(id: string): string[] {
  return groupById(id).children.map((child) => child.href);
}

describe('MAIN_NAV_ENTRIES', () => {
  it('ordena a barra por jornada', () => {
    expect(
      MAIN_NAV_ENTRIES.map((entry) =>
        entry.type === 'link' ? entry.href : entry.id,
      ),
    ).toEqual([
      '/',
      'producao',
      'planejamento',
      'paineis',
      'insumos',
      '/config',
    ]);
  });

  it('coloca etiquetas em produção, depois de saídas', () => {
    expect(groupHrefs('producao')).toEqual([
      '/realizado/fermentacao',
      '/realizado/forno',
      '/realizado/embalagem',
      '/realizado/saidas',
      '/etiquetas',
    ]);
  });

  it('separa planejamento, painéis e insumos', () => {
    expect(groupHrefs('planejamento')).toEqual([
      '/ordens-producao',
      '/reclamacoes',
    ]);
    expect(groupHrefs('paineis')).toEqual([
      '/realizado/painel-producao',
      '/realizado/fluxo-processo',
      '/painel/fermentacao',
      '/painel/forno',
      '/painel/embalagem',
      '/painel/dashboard-estoque',
    ]);
    expect(groupHrefs('insumos')).toEqual([
      '/estoque-insumos',
      '/consumo-insumos',
      '/sugestao-compras',
      '/compras-insumos',
      '/mapeamento-insumos',
    ]);
  });

  it('não marca painel de produção como item de Produção', () => {
    const producao = groupById('producao');
    expect(producao.match('/realizado/painel-producao')).toBe(false);
    expect(producao.match('/realizado/fluxo-processo')).toBe(false);
    expect(producao.match('/etiquetas')).toBe(true);
  });
});
