import { describe, expect, it } from 'vitest';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import {
  HUB_OPERACAO_ITEMS,
  HUB_PAINEIS_ITEMS,
  HUB_PRODUCAO_ITEMS,
} from '@/components/Hub/hub-nav-config';
import { filterHubNavItems } from '@/components/Hub/filter-hub-nav-items';

describe('filterHubNavItems', () => {
  const manager = new InternoAccessManager();

  it('owner vê todos os cards', () => {
    const snap = {
      isSystemOwner: true,
      identidades: ['interno'],
      modulosEfetivos: {},
    };

    expect(filterHubNavItems(HUB_PRODUCAO_ITEMS, snap, manager)).toHaveLength(
      HUB_PRODUCAO_ITEMS.length,
    );
    expect(filterHubNavItems(HUB_PAINEIS_ITEMS, snap, manager)).toHaveLength(
      HUB_PAINEIS_ITEMS.length,
    );
    expect(filterHubNavItems(HUB_OPERACAO_ITEMS, snap, manager)).toHaveLength(
      HUB_OPERACAO_ITEMS.length,
    );
  });

  it('persona tablet: fermentação + painel + fluxo', () => {
    const snap = {
      isSystemOwner: false,
      identidades: ['interno'],
      modulosEfetivos: {
        interno_fermentacao: 'editar' as const,
        interno_painel: 'ler' as const,
      },
    };

    const producao = filterHubNavItems(HUB_PRODUCAO_ITEMS, snap, manager);
    const paineis = filterHubNavItems(HUB_PAINEIS_ITEMS, snap, manager);
    const operacao = filterHubNavItems(HUB_OPERACAO_ITEMS, snap, manager);

    expect(producao.map((item) => item.href)).toEqual([
      '/realizado/fermentacao',
      '/realizado/painel-producao',
      '/realizado/fluxo-processo',
    ]);
    expect(paineis.map((item) => item.href)).toEqual([
      '/painel/fermentacao',
      '/painel/forno',
      '/painel/embalagem',
    ]);
    expect(operacao).toEqual([]);
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

    const operacao = filterHubNavItems(HUB_OPERACAO_ITEMS, snap, manager);
    expect(operacao.map((item) => item.href)).toEqual(['/ordens-producao']);
  });
});
