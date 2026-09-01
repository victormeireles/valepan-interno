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
      'paineis',
    ]);

    const producao = entries.find((e) => e.type === 'group' && e.id === 'producao');
    expect(producao?.type === 'group' ? producao.children.map((c) => c.href) : []).toEqual([
      '/realizado/fermentacao',
    ]);

    const paineis = entries.find((e) => e.type === 'group' && e.id === 'paineis');
    expect(paineis?.type === 'group' ? paineis.children.map((c) => c.href) : []).toEqual([
      '/realizado/painel-producao',
      '/realizado/fluxo-processo',
      '/painel/fermentacao',
      '/painel/forno',
      '/painel/embalagem',
    ]);
  });

  it('quadro fermentação aparece com módulo da área ou com painel', () => {
    const soFerm = {
      isSystemOwner: false,
      identidades: ['interno'],
      modulosEfetivos: { interno_fermentacao: 'editar' as const },
    };
    const soPainel = {
      isSystemOwner: false,
      identidades: ['interno'],
      modulosEfetivos: { interno_painel: 'ler' as const },
    };
    const hrefs = (snap: typeof soFerm) => {
      const entries = filterMainNavEntries(MAIN_NAV_ENTRIES, snap, manager);
      const paineis = entries.find((e) => e.type === 'group' && e.id === 'paineis');
      return paineis?.type === 'group' ? paineis.children.map((c) => c.href) : [];
    };
    expect(hrefs(soFerm)).toContain('/painel/fermentacao');
    expect(hrefs(soFerm)).not.toContain('/painel/forno');
    expect(hrefs(soPainel)).toEqual(
      expect.arrayContaining([
        '/painel/fermentacao',
        '/painel/forno',
        '/painel/embalagem',
      ]),
    );
  });
});
