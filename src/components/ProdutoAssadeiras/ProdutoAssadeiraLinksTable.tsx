'use client';

import type { ProdutoAssadeiraLink } from '@/domain/assadeiras/produto-assadeira-types';

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
    <div className="hidden md:block min-w-0">
      <table className="w-full table-fixed text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr className="text-left text-gray-500">
            <th scope="col" className="w-[4.5rem] px-3 py-2.5 font-semibold text-gray-600">
              Ordem
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold text-gray-600">
              Assadeira
            </th>
            <th
              scope="col"
              className="w-14 px-2 py-2.5 font-semibold text-gray-600 text-center"
            >
              Padrão
            </th>
            <th
              scope="col"
              className="w-14 px-2 py-2.5 font-semibold text-gray-600 text-center"
            >
              Override
            </th>
            <th
              scope="col"
              className="w-14 px-2 py-2.5 font-semibold text-gray-600 text-center"
            >
              Efetivo
            </th>
            <th scope="col" className="w-[5.5rem] px-2 py-2.5">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {links.map((link) => {
            const efetivo = formatEfetivo(link);
            const isDeletingThis =
              isDeletingAllLinks || deletingLinkId === link.id;
            const isRowBusy = isDeletingAllLinks || deletingLinkId != null;
            return (
              <tr
                key={link.id}
                className={`hover:bg-gray-50/80 transition-colors ${isDeletingThis ? 'opacity-60' : ''}`}
              >
                <td className="px-3 py-3 tabular-nums text-gray-700 align-middle">
                  <span className="font-medium">{link.ordem}</span>
                </td>
                <td className="px-3 py-3 align-middle min-w-0">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate" title={link.assadeira_nome}>
                      {link.assadeira_nome}
                    </p>
                    {!link.assadeira_ativo && (
                      <span className="mt-0.5 inline-flex rounded-full border border-gray-200 bg-gray-50 px-1.5 py-px text-[10px] font-medium text-gray-500">
                        Inativa
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-3 tabular-nums text-gray-600 text-center align-middle">
                  {formatOverride(link.assadeira_padrao)}
                </td>
                <td className="px-2 py-3 tabular-nums text-gray-600 text-center align-middle">
                  {formatOverride(link.unidades_por_assadeira)}
                </td>
                <td
                  className="px-2 py-3 tabular-nums font-semibold text-gray-900 text-center align-middle"
                  title={efetivo.title}
                >
                  {efetivo.text}
                </td>
                <td className="px-2 py-3 align-middle">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(link)}
                      disabled={isRowBusy}
                      aria-label={`Editar vínculo com ${link.assadeira_nome}`}
                      className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-icons text-lg" aria-hidden="true">
                        edit
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(link)}
                      disabled={isRowBusy}
                      aria-busy={isDeletingThis}
                      aria-label={
                        isDeletingThis
                          ? `Removendo vínculo com ${link.assadeira_nome}`
                          : `Remover vínculo com ${link.assadeira_nome}`
                      }
                      className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isDeletingThis ? (
                        <span
                          className="w-4 h-4 border-2 border-rose-300 border-t-rose-700 rounded-full animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="material-icons text-lg" aria-hidden="true">
                          delete
                        </span>
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
