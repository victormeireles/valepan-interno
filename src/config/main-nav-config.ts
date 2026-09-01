import type { InternoModuloId } from '@/lib/auth/interno-modulos-catalog';

export type MainNavLink = {
  type: 'link';
  href: string;
  label: string;
  icon: string;
  /** Ausente = sempre visível para quem já passou a porta do app (ex.: Início). */
  moduloId?: InternoModuloId;
  /** Se presente, vale o OR (mínimo ler). Senão usa `moduloId`. */
  moduloIds?: InternoModuloId[];
  match: (pathname: string) => boolean;
};

export type MainNavGroup = {
  type: 'group';
  id: string;
  label: string;
  icon: string;
  match: (pathname: string) => boolean;
  children: MainNavLink[];
};

export type MainNavEntry = MainNavLink | MainNavGroup;

export const MAIN_NAV_ENTRIES: MainNavEntry[] = [
  {
    type: 'link',
    href: '/',
    label: 'Início',
    icon: 'home',
    match: (pathname) => pathname === '/',
  },
  {
    type: 'group',
    id: 'producao',
    label: 'Produção',
    icon: 'precision_manufacturing',
    match: (pathname) =>
      pathname.startsWith('/ordens-producao') ||
      pathname.startsWith('/realizado/fermentacao') ||
      pathname.startsWith('/realizado/forno') ||
      pathname.startsWith('/realizado/embalagem') ||
      pathname.startsWith('/realizado/saidas') ||
      pathname.startsWith('/etiquetas') ||
      pathname.startsWith('/reclamacoes'),
    children: [
      {
        type: 'link',
        href: '/ordens-producao',
        label: 'Ordens',
        icon: 'format_list_numbered',
        moduloId: 'interno_ordens',
        match: (pathname) => pathname.startsWith('/ordens-producao'),
      },
      {
        type: 'link',
        href: '/realizado/fermentacao',
        label: 'Fermentação',
        icon: 'bakery_dining',
        moduloId: 'interno_fermentacao',
        match: (pathname) => pathname.startsWith('/realizado/fermentacao'),
      },
      {
        type: 'link',
        href: '/realizado/forno',
        label: 'Forno',
        icon: 'local_fire_department',
        moduloId: 'interno_forno',
        match: (pathname) => pathname.startsWith('/realizado/forno'),
      },
      {
        type: 'link',
        href: '/realizado/embalagem',
        label: 'Embalagem',
        icon: 'inventory_2',
        moduloId: 'interno_embalagem',
        match: (pathname) => pathname.startsWith('/realizado/embalagem'),
      },
      {
        type: 'link',
        href: '/realizado/saidas',
        label: 'Saídas',
        icon: 'local_shipping',
        moduloId: 'interno_saidas',
        match: (pathname) => pathname.startsWith('/realizado/saidas'),
      },
      {
        type: 'link',
        href: '/etiquetas',
        label: 'Etiquetas',
        icon: 'label',
        moduloId: 'interno_etiquetas',
        match: (pathname) => pathname.startsWith('/etiquetas'),
      },
      {
        type: 'link',
        href: '/reclamacoes',
        label: 'Reclamações',
        icon: 'report_problem',
        moduloId: 'interno_reclamacoes',
        match: (pathname) => pathname.startsWith('/reclamacoes'),
      },
    ],
  },
  {
    type: 'group',
    id: 'paineis',
    label: 'Painéis',
    icon: 'monitor',
    match: (pathname) =>
      pathname.startsWith('/realizado/painel-producao') ||
      pathname.startsWith('/realizado/fluxo-processo') ||
      pathname.startsWith('/painel/fermentacao') ||
      pathname.startsWith('/painel/forno') ||
      pathname.startsWith('/painel/embalagem') ||
      pathname.startsWith('/painel/dashboard-estoque') ||
      pathname.startsWith('/estoque/'),
    children: [
      {
        type: 'link',
        href: '/realizado/painel-producao',
        label: 'Produção',
        icon: 'monitor',
        moduloId: 'interno_painel',
        match: (pathname) => pathname.startsWith('/realizado/painel-producao'),
      },
      {
        type: 'link',
        href: '/realizado/fluxo-processo',
        label: 'Fluxo',
        icon: 'timeline',
        moduloId: 'interno_painel',
        match: (pathname) => pathname.startsWith('/realizado/fluxo-processo'),
      },
      {
        type: 'link',
        href: '/painel/fermentacao',
        label: 'Quadro fermentação',
        icon: 'bakery_dining',
        moduloId: 'interno_fermentacao',
        moduloIds: ['interno_fermentacao', 'interno_painel'],
        match: (pathname) => pathname.startsWith('/painel/fermentacao'),
      },
      {
        type: 'link',
        href: '/painel/forno',
        label: 'Quadro forno',
        icon: 'local_fire_department',
        moduloId: 'interno_forno',
        moduloIds: ['interno_forno', 'interno_painel'],
        match: (pathname) => pathname.startsWith('/painel/forno'),
      },
      {
        type: 'link',
        href: '/painel/embalagem',
        label: 'Quadro embalagem',
        icon: 'inventory_2',
        moduloId: 'interno_embalagem',
        moduloIds: ['interno_embalagem', 'interno_painel'],
        match: (pathname) => pathname.startsWith('/painel/embalagem'),
      },
      {
        type: 'link',
        href: '/painel/dashboard-estoque',
        label: 'Estoque',
        icon: 'dashboard',
        moduloId: 'interno_estoque',
        match: (pathname) =>
          pathname.startsWith('/painel/dashboard-estoque') ||
          pathname.startsWith('/estoque/'),
      },
    ],
  },
  {
    type: 'group',
    id: 'insumos',
    label: 'Insumos',
    icon: 'grain',
    match: (pathname) =>
      pathname.startsWith('/estoque-insumos') ||
      pathname.startsWith('/mapeamento-insumos') ||
      pathname.startsWith('/consumo-insumos') ||
      pathname.startsWith('/sugestao-compras') ||
      pathname.startsWith('/compras-insumos'),
    children: [
      {
        type: 'link',
        href: '/estoque-insumos',
        label: 'Estoque',
        icon: 'inventory',
        moduloId: 'interno_insumos',
        match: (pathname) => pathname.startsWith('/estoque-insumos'),
      },
      {
        type: 'link',
        href: '/mapeamento-insumos',
        label: 'Mapeamento',
        icon: 'link',
        moduloId: 'interno_insumos',
        match: (pathname) => pathname.startsWith('/mapeamento-insumos'),
      },
      {
        type: 'link',
        href: '/consumo-insumos',
        label: 'Consumo',
        icon: 'query_stats',
        moduloId: 'interno_insumos',
        match: (pathname) => pathname.startsWith('/consumo-insumos'),
      },
      {
        type: 'link',
        href: '/sugestao-compras',
        label: 'Sugestão de compra',
        icon: 'shopping_cart',
        moduloId: 'interno_insumos',
        match: (pathname) => pathname.startsWith('/sugestao-compras'),
      },
      {
        type: 'link',
        href: '/compras-insumos',
        label: 'Pedidos de compra',
        icon: 'receipt_long',
        moduloId: 'interno_insumos',
        match: (pathname) => pathname.startsWith('/compras-insumos'),
      },
    ],
  },
  {
    type: 'link',
    href: '/config',
    label: 'Configurações',
    icon: 'settings',
    moduloId: 'interno_config',
    match: (pathname) =>
      pathname === '/config' || pathname.startsWith('/config/'),
  },
];
