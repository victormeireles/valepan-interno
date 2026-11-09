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

  it('abre manutenção antes de configurações, com match por prefixo', () => {
    const manutencao = MAIN_NAV_ENTRIES.find(
      (entry) => entry.type === 'group' && entry.id === 'manutencao',
    );
    expect(manutencao?.type).toBe('group');
    if (!manutencao || manutencao.type !== 'group') return;

    expect(manutencao.label).toBe('Manutenção');
    expect(manutencao.children.map((child) => child.href)).toEqual([
      '/manutencao',
      '/manutencao/maquinas',
      '/manutencao/solicitantes',
    ]);
    expect(manutencao.children.map((child) => child.label)).toEqual([
      'Fila',
      'Máquinas',
      'Solicitantes',
    ]);
    expect(manutencao.children[0]).toMatchObject({
      moduloId: 'interno_manutencao',
      moduloIds: ['interno_manutencao', 'interno_manutencao_solicitacao'],
      icon: 'handyman',
    });
    expect(manutencao.children[1]?.moduloId).toBe('interno_manutencao');
    expect(manutencao.children[2]).toMatchObject({
      moduloId: 'interno_manutencao',
      nivelMinimo: 'administrar',
      icon: 'manage_accounts',
    });
    expect(manutencao.match('/manutencao')).toBe(true);
    expect(manutencao.match('/manutencao/maquinas')).toBe(true);
    expect(manutencao.match('/manutencao/solicitantes')).toBe(true);
    expect(manutencao.children[0]?.match('/manutencao')).toBe(true);
    expect(manutencao.children[0]?.match('/manutencao/maquinas')).toBe(false);
    expect(manutencao.children[1]?.match('/manutencao/maquinas')).toBe(true);
    expect(manutencao.children[2]?.match('/manutencao/solicitantes')).toBe(true);
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
