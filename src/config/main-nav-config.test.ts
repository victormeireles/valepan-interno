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
      'pessoas',
      'manutencao',
      '/config',
    ]);
  });

  it('abre manutenção antes de configurações, com peças na barra', () => {
    const manutencao = groupById('manutencao');

    expect(manutencao.label).toBe('Manutenção');
    expect(manutencao.children.map((child) => child.href)).toEqual([
      '/manutencao',
      '/manutencao/nova',
      '/manutencao/maquinas',
      '/manutencao/pecas',
      '/manutencao/preventiva',
      '/manutencao/indicadores',
      '/manutencao/solicitantes',
    ]);
    expect(manutencao.children.map((child) => child.label)).toEqual([
      'Fila',
      'Nova ordem',
      'Máquinas',
      'Peças',
      'Preventiva',
      'Indicadores',
      'Solicitantes',
    ]);
    expect(manutencao.children[0]).toMatchObject({
      moduloId: 'interno_manutencao',
      moduloIds: ['interno_manutencao', 'interno_manutencao_solicitacao'],
      icon: 'handyman',
    });
    expect(manutencao.children[1]).toMatchObject({
      href: '/manutencao/nova',
      label: 'Nova ordem',
      icon: 'add',
      moduloId: 'interno_manutencao',
      moduloIds: ['interno_manutencao', 'interno_manutencao_solicitacao'],
      nivelMinimo: 'editar',
    });
    expect(manutencao.children[2]?.moduloId).toBe('interno_manutencao');
    expect(manutencao.children[3]).toMatchObject({
      href: '/manutencao/pecas',
      label: 'Peças',
      icon: 'construction',
      moduloId: 'interno_manutencao',
    });
    expect(manutencao.children[4]).toMatchObject({
      href: '/manutencao/preventiva',
      label: 'Preventiva',
      icon: 'event_repeat',
      moduloId: 'interno_manutencao',
    });
    expect(manutencao.children[5]).toMatchObject({
      href: '/manutencao/indicadores',
      label: 'Indicadores',
      icon: 'analytics',
      moduloId: 'interno_manutencao',
    });
    expect(manutencao.children[6]).toMatchObject({
      moduloId: 'interno_manutencao',
      nivelMinimo: 'administrar',
      icon: 'manage_accounts',
    });
  });

  it('não marca a fila em peças, máquinas, solicitantes, nova ordem ou detalhe', () => {
    const manutencao = groupById('manutencao');
    const fila = manutencao.children.find((child) => child.href === '/manutencao');
    const nova = manutencao.children.find((child) => child.href === '/manutencao/nova');
    const maquinas = manutencao.children.find(
      (child) => child.href === '/manutencao/maquinas',
    );
    const pecas = manutencao.children.find((child) => child.href === '/manutencao/pecas');
    const preventiva = manutencao.children.find(
      (child) => child.href === '/manutencao/preventiva',
    );
    const indicadores = manutencao.children.find(
      (child) => child.href === '/manutencao/indicadores',
    );
    const solicitantes = manutencao.children.find(
      (child) => child.href === '/manutencao/solicitantes',
    );

    expect(manutencao.match('/manutencao')).toBe(true);
    expect(manutencao.match('/manutencao/maquinas')).toBe(true);
    expect(manutencao.match('/manutencao/pecas')).toBe(true);
    expect(manutencao.match('/manutencao/solicitantes')).toBe(true);
    expect(manutencao.match('/manutencao/nova')).toBe(true);
    expect(manutencao.match('/manutencao/ordens')).toBe(true);
    expect(manutencao.match('/manutencao/preventiva')).toBe(true);
    expect(manutencao.match('/manutencao/indicadores')).toBe(true);
    expect(fila?.match('/manutencao')).toBe(true);
    expect(fila?.match('/manutencao/maquinas')).toBe(false);
    expect(fila?.match('/manutencao/pecas')).toBe(false);
    expect(fila?.match('/manutencao/solicitantes')).toBe(false);
    expect(fila?.match('/manutencao/nova')).toBe(false);
    expect(fila?.match('/manutencao/ordens')).toBe(false);
    expect(fila?.match('/manutencao/ordens/12')).toBe(false);
    expect(fila?.match('/manutencao/preventiva')).toBe(false);
    expect(fila?.match('/manutencao/indicadores')).toBe(false);
    expect(nova?.match('/manutencao/nova')).toBe(true);
    expect(nova?.match('/manutencao/ordens')).toBe(false);
    expect(maquinas?.match('/manutencao/maquinas')).toBe(true);
    expect(pecas?.match('/manutencao/pecas')).toBe(true);
    expect(pecas?.match('/manutencao/pecas/entrada')).toBe(true);
    expect(preventiva?.match('/manutencao/preventiva')).toBe(true);
    expect(preventiva?.match('/manutencao')).toBe(false);
    expect(indicadores?.match('/manutencao/indicadores')).toBe(true);
    expect(indicadores?.match('/manutencao')).toBe(false);
    expect(pecas?.match('/manutencao')).toBe(false);
    expect(pecas?.match('/manutencao/maquinas')).toBe(false);
    expect(pecas?.match('/manutencao/solicitantes')).toBe(false);
    expect(solicitantes?.match('/manutencao/solicitantes')).toBe(true);
  });

  it('expõe colaboradores em pessoas com módulo interno_pessoas', () => {
    expect(groupHrefs('pessoas')).toEqual([
      '/pessoas',
      '/pessoas/quadro',
      '/pessoas/folha',
      '/pessoas/faltas',
      '/pessoas/extras',
      '/pessoas/painel',
    ]);
    expect(groupById('pessoas').children[0]?.moduloId).toBe('interno_pessoas');
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
