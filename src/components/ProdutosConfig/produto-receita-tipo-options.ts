import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';

export type TipoReceita = ReceitaWithRelations['tipo'];

export const PRODUTO_RECEITA_TIPO_OPTIONS: Array<{
  value: TipoReceita;
  label: string;
  helper: string;
  icon: string;
}> = [
  {
    value: 'massa',
    label: 'Massa',
    helper: 'Pães por receita — calculado pelo peso total da massa ÷ gramatura do pão.',
    icon: 'grain',
  },
  {
    value: 'brilho',
    label: 'Brilho',
    helper: 'Volume da receita (L) × pães por litro da gramatura do produto.',
    icon: 'wb_sunny',
  },
  {
    value: 'confeito',
    label: 'Confeito',
    helper: 'Peso da receita (kg) × pães por kg da gramatura do produto.',
    icon: 'cake',
  },
  {
    value: 'antimofo',
    label: 'Antimofo',
    helper: 'Quantidade de produtos que 1 receita de antimofo atende.',
    icon: 'sanitizer',
  },
  {
    value: 'embalagem',
    label: 'Embalagem',
    helper: 'Quantidade de pães por pacote.',
    icon: 'inventory_2',
  },
  {
    value: 'caixa',
    label: 'Caixa',
    helper: 'Quantidade de pacotes (ou pães) por caixa.',
    icon: 'all_inbox',
  },
];

export const PRODUTO_RECEITA_TIPO_LABELS = Object.fromEntries(
  PRODUTO_RECEITA_TIPO_OPTIONS.map((option) => [option.value, option.label]),
) as Record<TipoReceita, string>;
