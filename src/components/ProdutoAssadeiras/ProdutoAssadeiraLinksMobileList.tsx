'use client';

import type { ProdutoAssadeiraLink } from '@/app/actions/produto-assadeiras-actions';

type Props = {
  links: ProdutoAssadeiraLink[];
  onEdit: (link: ProdutoAssadeiraLink) => void;
  onDelete: (link: ProdutoAssadeiraLink) => void;
};

function formatOverride(value: number | null) {
  return value == null ? '—' : String(value);
}

export default function ProdutoAssadeiraLinksMobileList({
  links,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="md:hidden divide-y divide-gray-100">
      {links.map((link) => (
        <article key={link.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
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
              className="min-h-11 inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700"
            >
              <span className="material-icons text-base" aria-hidden="true">
                edit
              </span>
              Editar
            </button>
            <button
              type="button"
              onClick={() => onDelete(link)}
              className="min-h-11 inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-4 text-sm font-medium text-rose-700"
            >
              <span className="material-icons text-base" aria-hidden="true">
                delete
              </span>
              Remover
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
