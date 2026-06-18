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

export default function ProdutoAssadeiraLinksMobileList({
  links,
  onEdit,
  onDelete,
  deletingLinkId = null,
  isDeletingAllLinks = false,
}: Props) {
  return (
    <div className="md:hidden divide-y divide-gray-100">
      {links.map((link, index) => {
        const isDeletingThis =
          isDeletingAllLinks || deletingLinkId === link.id;
        const isRowBusy = isDeletingAllLinks || deletingLinkId != null;

        return (
        <article
          key={link.id}
          className={`p-4 space-y-3 ${isDeletingThis ? 'opacity-60' : ''}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-500 tabular-nums">
                  Ordem {link.ordem}
                </span>
                {index === 0 && (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Principal
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900">{link.assadeira_nome}</h3>
              {!link.assadeira_ativo && (
                <span className="mt-1 inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500">
                  Inativa
                </span>
              )}
            </div>
            <p className="text-sm font-semibold tabular-nums text-gray-900">
              {link.unidades_efetivas ?? '—'} efetivo
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-gray-500">Padrão</dt>
              <dd className="tabular-nums text-gray-900">
                {formatOverride(link.assadeira_padrao)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Override</dt>
              <dd className="tabular-nums text-gray-900">
                {formatOverride(link.unidades_por_assadeira)}
              </dd>
            </div>
          </dl>

          {link.unidades_efetivas == null && (
            <p className="text-xs text-amber-700">
              Configure pães por assadeira no tipo ou defina override.
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onEdit(link)}
              disabled={isRowBusy}
              className="min-h-11 inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="min-h-11 inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-4 text-sm font-medium text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </article>
      );
      })}
    </div>
  );
}
