import { describe, expect, it } from 'vitest';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import {
  HUB_INSUMOS_ITEMS,
  HUB_PAINEIS_ITEMS,
  HUB_PLANEJAMENTO_ITEMS,
  HUB_PRODUCAO_ITEMS,
  HUB_SECTIONS,
} from '@/components/Hub/hub-nav-config';
import { filterHubNavItems } from '@/components/Hub/filter-hub-nav-items';

describe('HUB_SECTIONS', () => {
  it('espelha a barra: produção, planejamento, painéis, insumos', () => {
    expect(HUB_SECTIONS.map((section) => section.id)).toEqual([
      'producao',
      'planejamento',
      'paineis',
      'insumos',
    ]);
  });

  it('coloca etiquetas em produção e sugestão de compra em insumos', () => {
    expect(HUB_PRODUCAO_ITEMS.map((item) => item.href)).toEqual([
      '/realizado/fermentacao',
      '/realizado/forno',
      '/realizado/embalagem',
      '/realizado/saidas',
      '/etiquetas',
    ]);
    expect(HUB_PLANEJAMENTO_ITEMS.map((item) => item.href)).toEqual([
      '/ordens-producao',
      '/reclamacoes',
    ]);
    expect(HUB_PAINEIS_ITEMS.map((item) => item.href)).toEqual([
      '/realizado/painel-producao',
      '/realizado/fluxo-processo',
      '/painel/fermentacao',
      '/painel/forno',
      '/painel/embalagem',
      '/painel/dashboard-estoque',
    ]);
    expect(HUB_INSUMOS_ITEMS.map((item) => item.href)).toEqual([
      '/estoque-insumos',
      '/consumo-insumos',
      '/sugestao-compras',
      '/compras-insumos',
      '/mapeamento-insumos',
    ]);
  });
});

describe('filterHubNavItems', () => {
  const manager = new InternoAccessManager();

  it('owner vê todos os cards', () => {
    const snap = {
      isSystemOwner: true,
      identidades: ['interno'],
      modulosEfetivos: {},
    };

    for (const section of HUB_SECTIONS) {
      expect(filterHubNavItems(section.items, snap, manager)).toHaveLength(
        section.items.length,
      );
    }
  });

  it('persona tablet: fermentação na produção; painel e fluxo nos painéis', () => {
    const snap = {
      isSystemOwner: false,
      identidades: ['interno'],
      modulosEfetivos: {
        interno_fermentacao: 'editar' as const,
        interno_painel: 'ler' as const,
      },
    };

    expect(
      filterHubNavItems(HUB_PRODUCAO_ITEMS, snap, manager).map((item) => item.href),
    ).toEqual(['/realizado/fermentacao']);
    expect(
      filterHubNavItems(HUB_PAINEIS_ITEMS, snap, manager).map((item) => item.href),
    ).toEqual([
      '/realizado/painel-producao',
      '/realizado/fluxo-processo',
      '/painel/fermentacao',
      '/painel/forno',
      '/painel/embalagem',
    ]);
    expect(filterHubNavItems(HUB_PLANEJAMENTO_ITEMS, snap, manager)).toEqual([]);
    expect(filterHubNavItems(HUB_INSUMOS_ITEMS, snap, manager)).toEqual([]);
  });

  it('fermentação-only vê só o quadro da área', () => {
    const snap = {
      isSystemOwner: false,
      identidades: ['interno'],
      modulosEfetivos: { interno_fermentacao: 'editar' as const },
    };
    expect(
      filterHubNavItems(HUB_PAINEIS_ITEMS, snap, manager).map((item) => item.href),
    ).toEqual(['/painel/fermentacao']);
  });

  it('nível ler já libera o card do módulo', () => {
    const snap = {
      isSystemOwner: false,
      identidades: ['interno'],
      modulosEfetivos: {
        interno_ordens: 'ler' as const,
      },
    };

    const planejamento = filterHubNavItems(HUB_PLANEJAMENTO_ITEMS, snap, manager);
    expect(planejamento.map((item) => item.href)).toEqual(['/ordens-producao']);
  });
});
