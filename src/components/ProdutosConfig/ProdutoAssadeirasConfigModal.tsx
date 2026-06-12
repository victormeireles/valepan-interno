'use client';

import { useEffect, useId, useState } from 'react';
import {
  getProdutoAssadeiraRegraPreview,
  type ProdutoAssadeiraLink,
  type ProdutoComAssadeirasResumo,
} from '@/app/actions/produto-assadeiras-actions';
import ProdutoAssadeiraLinksMobileList from '@/components/ProdutoAssadeiras/ProdutoAssadeiraLinksMobileList';
import ProdutoAssadeiraLinksTable from '@/components/ProdutoAssadeiras/ProdutoAssadeiraLinksTable';
import ProdutoAssadeiraRegraPreview from '@/components/ProdutosConfig/ProdutoAssadeiraRegraPreview';
import type { AssadeiraVinculoResolvido } from '@/domain/assadeiras/assadeira-resolver-types';

type Props = {
  isOpen: boolean;
  produto: ProdutoComAssadeirasResumo;
  links: ProdutoAssadeiraLink[];
  isLoadingLinks?: boolean;
  onClose: () => void;
  onAddLink: () => void;
  onEditLink: (link: ProdutoAssadeiraLink) => void;
  onDeleteLink: (link: ProdutoAssadeiraLink) => void | Promise<void>;
  onDeleteAllLinks: () => void | Promise<void>;
  deletingLinkId?: string | null;
  isDeletingAllLinks?: boolean;
  children?: React.ReactNode;
};

const primaryButtonClassName =
  'min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

export default function ProdutoAssadeirasConfigModal({
  isOpen,
  produto,
  links,
  isLoadingLinks = false,
  onClose,
  onAddLink,
  onEditLink,
  onDeleteLink,
  onDeleteAllLinks,
  deletingLinkId = null,
  isDeletingAllLinks = false,
  children,
}: Props) {
  const isDeleting = isDeletingAllLinks || deletingLinkId != null;
  const titleId = useId();
  const [regraPreview, setRegraPreview] = useState<AssadeiraVinculoResolvido[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setRegraPreview([]);
      return;
    }

    if (isLoadingLinks) {
      return;
    }

    if (links.length > 0) {
      setRegraPreview([]);
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);
    getProdutoAssadeiraRegraPreview(produto.id)
      .then((vinculos) => {
        if (!cancelled) setRegraPreview(vinculos);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isLoadingLinks, produto.id, links.length]);

  if (!isOpen) return null;

  const hasInvalidFactor = links.some((link) => link.unidades_efetivas == null);
  const hasExcecoes = links.length > 0;

  const handleDeleteAll = () => {
    if (
      !confirm(
        'Remover todas as exceções manuais? O produto voltará a usar a regra de categoria + peso.',
      )
    ) {
      return;
    }
    onDeleteAllLinks();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-white w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
      >
        <div className="border-b border-gray-100 px-6 py-5 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Assadeiras
            </p>
            <h2 id={titleId} className="text-xl font-bold text-gray-900 truncate">
              {produto.nome}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Vínculos aqui são exceções à regra de categoria + peso.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 shrink-0"
          >
            <span className="material-icons" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {hasInvalidFactor && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Alguns vínculos não têm fator efetivo. Configure pães por assadeira no tipo ou
              defina override.
            </div>
          )}

          {isLoadingLinks && (
            <p className="text-sm text-gray-500" role="status" aria-live="polite">
              Carregando vínculos…
            </p>
          )}

          {!isLoadingLinks && !hasExcecoes && loadingPreview && (
            <p className="text-sm text-gray-500">Carregando regra aplicável…</p>
          )}

          {!hasExcecoes && !loadingPreview && regraPreview.length > 0 && (
            <ProdutoAssadeiraRegraPreview vinculos={regraPreview} />
          )}

          {!isLoadingLinks && hasExcecoes ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="min-h-11 px-4 py-2.5 text-sm font-semibold text-rose-700 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {isDeletingAllLinks ? (
                    <>
                      <span
                        className="w-4 h-4 border-2 border-rose-300 border-t-rose-700 rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      Removendo exceções…
                    </>
                  ) : (
                    'Remover todas as exceções'
                  )}
                </button>
                <button
                  type="button"
                  onClick={onAddLink}
                  disabled={isDeleting}
                  className={`${primaryButtonClassName} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="material-icons text-base" aria-hidden="true">
                    add
                  </span>
                  Vincular assadeira
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <ProdutoAssadeiraLinksTable
                  links={links}
                  onEdit={onEditLink}
                  onDelete={onDeleteLink}
                  deletingLinkId={deletingLinkId}
                  isDeletingAllLinks={isDeletingAllLinks}
                />
                <ProdutoAssadeiraLinksMobileList
                  links={links}
                  onEdit={onEditLink}
                  onDelete={onDeleteLink}
                  deletingLinkId={deletingLinkId}
                  isDeletingAllLinks={isDeletingAllLinks}
                />
              </div>
            </>
          ) : !isLoadingLinks ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <span className="material-icons text-3xl text-gray-300" aria-hidden="true">
                  {regraPreview.length > 0 ? 'rule' : 'link_off'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {regraPreview.length > 0
                  ? 'Sem exceções manuais'
                  : 'Nenhuma assadeira configurada'}
              </h3>
              <p className="text-sm text-gray-500 text-center mt-1 max-w-sm">
                {regraPreview.length > 0
                  ? 'O produto usa a regra acima. Adicione uma exceção para sobrescrever.'
                  : 'Sem regra aplicável nem exceção. Configure regras em Regras de assadeira ou vincule manualmente.'}
              </p>
              <button type="button" onClick={onAddLink} className={`mt-4 ${primaryButtonClassName}`}>
                Criar exceção manual
              </button>
            </div>
          ) : null}
        </div>

        {children}
      </div>
    </div>
  );
}
