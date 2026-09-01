import type { InternoModuloId } from '@/lib/auth/interno-modulos-catalog';

export interface HubNavItem {
  href: string;
  title: string;
  description: string;
  icon: string;
  moduloId: InternoModuloId;
  /** Se presente, vale o OR (mínimo ler). Senão usa `moduloId`. */
  moduloIds?: InternoModuloId[];
}

export const HUB_PRODUCAO_ITEMS: HubNavItem[] = [
  {
    href: '/realizado/fermentacao',
    title: 'Fermentação',
    description: 'Registro de produção da fermentação',
    icon: 'bakery_dining',
    moduloId: 'interno_fermentacao',
  },
  {
    href: '/realizado/forno',
    title: 'Forno',
    description: 'Registro de produção do forno',
    icon: 'local_fire_department',
    moduloId: 'interno_forno',
  },
  {
    href: '/realizado/embalagem',
    title: 'Embalagem',
    description: 'Registro de produção da embalagem',
    icon: 'inventory_2',
    moduloId: 'interno_embalagem',
  },
  {
    href: '/realizado/saidas',
    title: 'Saídas',
    description: 'Controle de saídas com meta e foto',
    icon: 'local_shipping',
    moduloId: 'interno_saidas',
  },
  {
    href: '/realizado/painel-producao',
    title: 'Painel',
    description: 'Visão unificada de fermentação, forno e embalagem',
    icon: 'monitor',
    moduloId: 'interno_painel',
  },
  {
    href: '/realizado/fluxo-processo',
    title: 'Fluxo de Produção',
    description: 'Hora a hora por etapa e por assadeira',
    icon: 'timeline',
    moduloId: 'interno_painel',
  },
];

export const HUB_PAINEIS_ITEMS: HubNavItem[] = [
  {
    href: '/painel/fermentacao',
    title: 'Quadro fermentação',
    description: 'Monitor da fermentação na TV',
    icon: 'bakery_dining',
    moduloId: 'interno_fermentacao',
    moduloIds: ['interno_fermentacao', 'interno_painel'],
  },
  {
    href: '/painel/forno',
    title: 'Quadro forno',
    description: 'Monitor do forno na TV',
    icon: 'local_fire_department',
    moduloId: 'interno_forno',
    moduloIds: ['interno_forno', 'interno_painel'],
  },
  {
    href: '/painel/embalagem',
    title: 'Quadro embalagem',
    description: 'Monitor da embalagem na TV',
    icon: 'inventory_2',
    moduloId: 'interno_embalagem',
    moduloIds: ['interno_embalagem', 'interno_painel'],
  },
];

export const HUB_OPERACAO_ITEMS: HubNavItem[] = [
  {
    href: '/ordens-producao',
    title: 'Ordens de Produção',
    description: 'Fila e planejamento do dia',
    icon: 'list_alt',
    moduloId: 'interno_ordens',
  },
  {
    href: '/etiquetas',
    title: 'Etiquetas',
    description: 'Fila de etiquetas e reimpressão',
    icon: 'label',
    moduloId: 'interno_etiquetas',
  },
  {
    href: '/reclamacoes',
    title: 'Reclamações',
    description: 'Problemas reportados pelos clientes',
    icon: 'report_problem',
    moduloId: 'interno_reclamacoes',
  },
  {
    href: '/estoque-insumos',
    title: 'Estoque de insumos',
    description: 'Saldos, histórico e ajustes manuais',
    icon: 'grain',
    moduloId: 'interno_insumos',
  },
  {
    href: '/mapeamento-insumos',
    title: 'Mapeamento de insumos',
    description: 'Vínculos Omie, pendências de NF e sugestões com IA',
    icon: 'link',
    moduloId: 'interno_insumos',
  },
  {
    href: '/consumo-insumos',
    title: 'Consumo de insumos',
    description: 'Tabela semanal de saídas do estoque de insumos',
    icon: 'query_stats',
    moduloId: 'interno_insumos',
  },
  {
    href: '/compras-insumos',
    title: 'Pedidos de compra',
    description: 'Pedidos a chegar, atrasados e histórico',
    icon: 'receipt_long',
    moduloId: 'interno_insumos',
  },
  {
    href: '/painel/dashboard-estoque',
    title: 'Estoque',
    description: 'Dashboards em TV e monitor',
    icon: 'inventory',
    moduloId: 'interno_estoque',
  },
  {
    href: '/config',
    title: 'Configurações',
    description: 'Assadeiras, produtos, insumos e mais',
    icon: 'settings',
    moduloId: 'interno_config',
  },
];
