export interface HubNavItem {
  href: string;
  title: string;
  description: string;
  icon: string;
}

export const HUB_PRODUCAO_ITEMS: HubNavItem[] = [
  {
    href: '/realizado/fermentacao',
    title: 'Fermentação',
    description: 'Registro de produção da fermentação',
    icon: 'bakery_dining',
  },
  {
    href: '/realizado/forno',
    title: 'Forno',
    description: 'Registro de produção do forno',
    icon: 'local_fire_department',
  },
  {
    href: '/realizado/embalagem',
    title: 'Embalagem',
    description: 'Registro de produção da embalagem',
    icon: 'inventory_2',
  },
  {
    href: '/realizado/saidas',
    title: 'Saídas',
    description: 'Controle de saídas com meta e foto',
    icon: 'local_shipping',
  },
  {
    href: '/realizado/painel-producao',
    title: 'Painel',
    description: 'Visão unificada de fermentação, forno e embalagem',
    icon: 'monitor',
  },
];

export const HUB_OPERACAO_ITEMS: HubNavItem[] = [
  {
    href: '/ordens-producao',
    title: 'Ordens de Produção',
    description: 'Fila e planejamento do dia',
    icon: 'list_alt',
  },
  {
    href: '/etiquetas',
    title: 'Etiquetas',
    description: 'Fila de etiquetas e reimpressão',
    icon: 'label',
  },
  {
    href: '/estoque-insumos',
    title: 'Estoque de insumos',
    description: 'Saldos, histórico e ajustes manuais',
    icon: 'grain',
  },
  {
    href: '/mapeamento-insumos',
    title: 'Mapeamento de insumos',
    description: 'Vínculos Omie, pendências de NF e sugestões com IA',
    icon: 'link',
  },
  {
    href: '/painel/dashboard-estoque',
    title: 'Estoque',
    description: 'Dashboards em TV e monitor',
    icon: 'inventory',
  },
  {
    href: '/config',
    title: 'Configurações',
    description: 'Assadeiras, produtos, insumos e mais',
    icon: 'settings',
  },
];
