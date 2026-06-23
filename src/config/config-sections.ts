export type ConfigSection = {
  href: string;
  label: string;
  icon: string;
  description: string;
};

export const CONFIG_SECTIONS: readonly ConfigSection[] = [
  {
    href: '/config/assadeiras',
    label: 'Assadeiras',
    icon: 'bakery_dining',
    description: 'Tipos de assadeira, capacidade e estoque',
  },
  {
    href: '/config/regras-assadeiras',
    label: 'Regras de assadeira',
    icon: 'rule',
    description: 'Regras de uso e capacidade por produto',
  },
  {
    href: '/config/produtos',
    label: 'Produtos',
    icon: 'inventory_2',
    description: 'Produtos e relação com assadeiras',
  },
  {
    href: '/config/categorias',
    label: 'Categorias',
    icon: 'category',
    description: 'Visibilidade de categorias no painel de embalagem',
  },
  {
    href: '/config/insumos',
    label: 'Insumos',
    icon: 'inventory',
    description: 'Matérias-primas e custos unitários',
  },
  {
    href: '/config/receitas',
    label: 'Receitas',
    icon: 'menu_book',
    description: 'Receitas de massa, brilho, confeito e mais',
  },
  {
    href: '/config/tipos-estoque',
    label: 'Tipos de estoque',
    icon: 'warehouse',
    description: 'Categorias e unidades de estoque',
  },
  {
    href: '/config/whatsapp',
    label: 'WhatsApp',
    icon: 'chat',
    description: 'Notificações de produção',
  },
] as const;
