'use client';

import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';

export type ReceitaSortKey = 'nome' | 'tipo' | 'codigo' | 'ativo';

const TIPO_LABELS: Record<ReceitaWithRelations['tipo'], string> = {
  massa: 'Massa',
  brilho: 'Brilho',
  confeito: 'Confeito',
  antimofo: 'Antimofo',
  embalagem: 'Embalagem',
  caixa: 'Caixa',
};

type Props = {
  items: ReceitaWithRelations[];
  sortKey: ReceitaSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: ReceitaSortKey) => void;
  onRowClick: (item: ReceitaWithRelations) => void;
  embedded?: boolean;
};

function isAtiva(receita: ReceitaWithRelations) {
  return receita.ativo !== false;
}

function countIngredientes(receita: ReceitaWithRelations) {
  return receita.receita_ingredientes?.length ?? 0;
}

function countProdutos(receita: ReceitaWithRelations) {
  return (receita.produto_receitas ?? []).filter((link) => link.ativo).length;
}

export default function ReceitasConfigTable({
  items,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  embedded = false,
}: Props) {
  const sortAriaValue = (key: ReceitaSortKey) => {
    if (key !== sortKey) return 'none' as const;
    return sortDir === 'asc' ? ('ascending' as const) : ('descending' as const);
  };

  const wrapperClassName = embedded
    ? 'hidden md:block overflow-x-auto'
    : 'hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden';

  const headers: { key: ReceitaSortKey | null; label: string }[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'codigo', label: 'Código' },
    { key: null, label: 'Ingredientes' },
    { key: null, label: 'Produtos' },
    { key: 'ativo', label: 'Status' },
  ];

  return (
    <div className={wrapperClassName}>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {headers.map(({ key, label }) => (
              <th
                key={label}
                scope="col"
                className="px-4 py-3 font-semibold text-gray-600 text-left"
                aria-sort={key ? sortAriaValue(key) : undefined}
              >
                {key ? (
                  <button
                    type="button"
                    onClick={() => onSort(key)}
                    className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                  >
                    {label}
                    {sortKey === key && (
                      <span className="material-icons text-base" aria-hidden="true">
                        {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </button>
                ) : (
                  label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              tabIndex={0}
              onClick={() => onRowClick(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(item);
                }
              }}
              className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                !isAtiva(item) ? 'opacity-60' : ''
              }`}
            >
              <td className="px-4 py-3 font-medium text-gray-900">{item.nome}</td>
              <td className="px-4 py-3 text-gray-600">{TIPO_LABELS[item.tipo]}</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.codigo || '—'}</td>
              <td className="px-4 py-3 text-gray-600 tabular-nums">{countIngredientes(item)}</td>
              <td className="px-4 py-3 text-gray-600 tabular-nums">{countProdutos(item)}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    isAtiva(item)
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isAtiva(item) ? 'Ativa' : 'Inativa'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
