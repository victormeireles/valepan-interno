import { describe, expect, it } from 'vitest';
import {
  InternoAccessManager,
  type UsuarioAuthzSnapshot,
} from '@/lib/auth/interno-access-manager';
import {
  HUB_INSUMOS_ITEMS,
  HUB_PAINEIS_ITEMS,
  HUB_PESSOAS_ITEMS,
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
      'pessoas',
      'manutencao',
    ]);
  });

  it('abre manutenção com fila, nova ordem, máquinas, peças e solicitantes', () => {
    const secao = HUB_SECTIONS.find((section) => section.id === 'manutencao');
    expect(secao?.title).toBe('Manutenção');
    expect(secao?.items).toEqual([
      {
        href: '/manutencao',
        title: 'Fila',
        description: 'Ordens abertas e recebidas',
        icon: 'handyman',
        moduloId: 'interno_manutencao',
        moduloIds: ['interno_manutencao', 'interno_manutencao_solicitacao'],
      },
      {
        href: '/manutencao/nova',
        title: 'Nova ordem',
        description: 'Abrir corretiva',
        icon: 'add',
        moduloId: 'interno_manutencao',
        moduloIds: ['interno_manutencao', 'interno_manutencao_solicitacao'],
        nivelMinimo: 'editar',
      },
      {
        href: '/manutencao/maquinas',
        title: 'Máquinas',
        description: 'Cadastro por setor',
        icon: 'precision_manufacturing',
        moduloId: 'interno_manutencao',
      },
      {
        href: '/manutencao/pecas',
        title: 'Peças',
        description: 'Saldo e movimentos',
        icon: 'construction',
        moduloId: 'interno_manutencao',
      },
      {
        href: '/manutencao/solicitantes',
        title: 'Solicitantes',
        description: 'Setores que podem abrir ordem',
        icon: 'manage_accounts',
        moduloId: 'interno_manutencao',
        nivelMinimo: 'administrar',
      },
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

  it('mostra Nova ordem a quem edita manutenção ou solicitação', () => {
    const secao = HUB_SECTIONS.find((section) => section.id === 'manutencao');
    const hrefs = (modulosEfetivos: UsuarioAuthzSnapshot['modulosEfetivos']) =>
      filterHubNavItems(
        secao?.items ?? [],
        {
          isSystemOwner: false,
          identidades: ['interno'],
          modulosEfetivos,
        },
        manager,
      ).map((item) => item.href);

    expect(
      hrefs({
        interno_manutencao: 'ler',
        interno_manutencao_solicitacao: 'ler',
      }),
    ).not.toContain('/manutencao/nova');
    expect(hrefs({ interno_manutencao: 'editar' })).toContain('/manutencao/nova');
    expect(hrefs({ interno_manutencao_solicitacao: 'editar' })).toContain(
      '/manutencao/nova',
    );
  });

  it('folha do hub só aparece para quem administra pessoas', () => {
    const hrefs = (nivel: 'ler' | 'administrar') =>
      filterHubNavItems(
        HUB_PESSOAS_ITEMS,
        {
          isSystemOwner: false,
          identidades: ['interno'],
          modulosEfetivos: { interno_pessoas: nivel },
        },
        manager,
      ).map((item) => item.href);
    expect(hrefs('ler')).not.toContain('/pessoas/folha');
    expect(hrefs('administrar')).toContain('/pessoas/folha');
  });
});
