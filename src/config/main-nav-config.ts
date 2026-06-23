export type MainNavLink = {
  type: 'link';
  href: string;
  label: string;
  icon: string;
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
      pathname.startsWith('/realizado') ||
      pathname.startsWith('/etiquetas'),
    children: [
      {
        type: 'link',
        href: '/ordens-producao',
        label: 'Ordens',
        icon: 'format_list_numbered',
        match: (pathname) => pathname.startsWith('/ordens-producao'),
      },
      {
        type: 'link',
        href: '/realizado/fermentacao',
        label: 'Fermentação',
        icon: 'bakery_dining',
        match: (pathname) => pathname.startsWith('/realizado/fermentacao'),
      },
      {
        type: 'link',
        href: '/realizado/forno',
        label: 'Forno',
        icon: 'local_fire_department',
        match: (pathname) => pathname.startsWith('/realizado/forno'),
      },
      {
        type: 'link',
        href: '/realizado/embalagem',
        label: 'Embalagem',
        icon: 'inventory_2',
        match: (pathname) => pathname.startsWith('/realizado/embalagem'),
      },
      {
        type: 'link',
        href: '/realizado/saidas',
        label: 'Saídas',
        icon: 'local_shipping',
        match: (pathname) => pathname.startsWith('/realizado/saidas'),
      },
      {
        type: 'link',
        href: '/etiquetas',
        label: 'Etiquetas',
        icon: 'label',
        match: (pathname) => pathname.startsWith('/etiquetas'),
      },
    ],
  },
  {
    type: 'link',
    href: '/painel/dashboard-estoque',
    label: 'Estoque',
    icon: 'dashboard',
    match: (pathname) =>
      pathname.startsWith('/painel/dashboard-estoque') ||
      pathname.startsWith('/estoque/'),
  },
  {
    type: 'group',
    id: 'insumos',
    label: 'Insumos',
    icon: 'grain',
    match: (pathname) =>
      pathname.startsWith('/estoque-insumos') ||
      pathname.startsWith('/config/insumos'),
    children: [
      {
        type: 'link',
        href: '/estoque-insumos',
        label: 'Estoque',
        icon: 'inventory',
        match: (pathname) => pathname.startsWith('/estoque-insumos'),
      },
      {
        type: 'link',
        href: '/config/insumos',
        label: 'Cadastro',
        icon: 'tune',
        match: (pathname) => pathname.startsWith('/config/insumos'),
      },
    ],
  },
  {
    type: 'link',
    href: '/config',
    label: 'Configurações',
    icon: 'settings',
    match: (pathname) =>
      pathname === '/config' ||
      (pathname.startsWith('/config/') && !pathname.startsWith('/config/insumos')),
  },
];
