import { describe, expect, it } from 'vitest';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import { filterMainNavEntries } from '@/config/filter-main-nav-entries';
import { MAIN_NAV_ENTRIES } from '@/config/main-nav-config';

describe('filterMainNavEntries', () => {
  const manager = new InternoAccessManager();

  it('owner vê todos os links', () => {
    const snap = {
      isSystemOwner: true,
      identidades: ['interno'],
      modulosEfetivos: {},
    };
    expect(filterMainNavEntries(MAIN_NAV_ENTRIES, snap, manager)).toHaveLength(
      MAIN_NAV_ENTRIES.length,
    );
  });

  it('tablet fermentação vê Início + Produção (fermentação/painel)', () => {
    const snap = {
      isSystemOwner: false,
      identidades: ['interno'],
      modulosEfetivos: {
        interno_fermentacao: 'editar' as const,
        interno_painel: 'ler' as const,
      },
    };

    const entries = filterMainNavEntries(MAIN_NAV_ENTRIES, snap, manager);
    expect(entries.map((e) => (e.type === 'link' ? e.href : e.id))).toEqual([
      '/',
      'producao',
    ]);

    const producao = entries.find((e) => e.type === 'group' && e.id === 'producao');
    expect(producao?.type === 'group' ? producao.children.map((c) => c.href) : []).toEqual([
      '/realizado/fermentacao',
      '/realizado/painel-producao',
    ]);
  });
});
