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
    ).toEqual(['/', 'producao', 'paineis', 'insumos', '/config']);
  });

  it('coloca os quadros TV em Painéis, depois do Fluxo', () => {
    expect(groupHrefs('paineis')).toEqual([
      '/realizado/painel-producao',
      '/realizado/fluxo-processo',
      '/painel/fermentacao',
      '/painel/forno',
      '/painel/embalagem',
      '/painel/dashboard-estoque',
    ]);
  });
});
