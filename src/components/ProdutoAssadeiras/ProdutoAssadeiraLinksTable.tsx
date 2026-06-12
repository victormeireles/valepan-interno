'use client';

import type { ProdutoAssadeiraLink } from '@/app/actions/produto-assadeiras-actions';

type Props = {
  links: ProdutoAssadeiraLink[];
  onEdit: (link: ProdutoAssadeiraLink) => void;
  onDelete: (link: ProdutoAssadeiraLink) => void | Promise<void>;
  deletingLinkId?: string | null;
  isDeletingAllLinks?: boolean;
};

function formatOverride(value: number | null) {
  return value == null ? '—' : String(value);
}

function formatEfetivo(link: ProdutoAssadeiraLink) {
  if (link.unidades_efetivas == null) {
    return { text: '—', title: 'Configure pães por assadeira no tipo ou defina override' };
  }
  return { text: String(link.unidades_efetivas), title: undefined };
}

export default function ProdutoAssadeiraLinksTable({
  links,
  onEdit,
  onDelete,
  deletingLinkId = null,
  isDeletingAllLinks = false,
}: Props) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-gray-500">
            <th scope="col" className="px-4 py-3 font-medium">
              Ordem
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Assadeira
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Padrão
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Override
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Efetivo
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-right">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {links.map((link, index) => {
            const efetivo = formatEfetivo(link);
            const isDeletingThis =
              isDeletingAllLinks || deletingLinkId === link.id;
            const isRowBusy = isDeletingAllLinks || deletingLinkId != null;
            return (
              <tr
                key={link.id}
                className={`hover:bg-gray-50/80 ${isDeletingThis ? 'opacity-60' : ''}`}
              >
                <td className="px-4 py-3 tabular-nums text-gray-700">
                  <div className="flex items-center gap-2">
                    <span>{link.ordem}</span>
                    {index === 0 && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Principal
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{link.assadeira_nome}</span>
                    {!link.assadeira_ativo && (
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500">
                        Inativa
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-700">
                  {formatOverride(link.assadeira_padrao)}
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-700">
                  {formatOverride(link.unidades_por_assadeira)}
                </td>
                <td
                  className="px-4 py-3 tabular-nums font-semibold text-gray-900"
                  title={efetivo.title}
                >
                  {efetivo.text}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(link)}
                      disabled={isRowBusy}
                      className="min-h-11 inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-icons text-base" aria-hidden="true">
                        edit
                      </span>
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(link)}
                      disabled={isRowBusy}
                      aria-busy={isDeletingThis}
                      className="min-h-11 inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeletingThis ? (
                        <>
                          <span
                            className="w-4 h-4 border-2 border-rose-300 border-t-rose-700 rounded-full animate-spin"
                            aria-hidden="true"
                          />
                          Removendo…
                        </>
                      ) : (
                        <>
                          <span className="material-icons text-base" aria-hidden="true">
                            delete
                          </span>
                          Remover
                        </>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
