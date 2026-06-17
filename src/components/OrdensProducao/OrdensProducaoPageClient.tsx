'use client';

import OrdensProducaoToolbar from '@/components/OrdensProducao/OrdensProducaoToolbar';
import OrdensProducaoList from '@/components/OrdensProducao/OrdensProducaoList';
import OrdensProducaoEmptyState from '@/components/OrdensProducao/OrdensProducaoEmptyState';
import OrdensProducaoListSkeleton from '@/components/OrdensProducao/OrdensProducaoListSkeleton';
import OrdemProducaoFormModal from '@/components/OrdensProducao/OrdemProducaoFormModal';
import OrdensProducaoBatchModal from '@/components/OrdensProducao/OrdensProducaoBatchModal';
import { useOrdensProducaoPage } from '@/components/OrdensProducao/useOrdensProducaoPage';
import {
  ordensProducaoContainerClass,
  ordensProducaoPageClass,
  ordensProducaoPanelClass,
  ordensProducaoSecondaryButtonClass,
  ordensProducaoToastErrorClass,
  ordensProducaoToastSuccessClass,
} from '@/components/OrdensProducao/ordens-producao-theme';

export default function OrdensProducaoPageClient() {
  const {
    filterDate,
    setFilterDate,
    ordens,
    resumo,
    loading,
    error,
    toast,
    formOpen,
    formMode,
    editingOrder,
    batchOpen,
    deleteTarget,
    setBatchOpen,
    setDeleteTarget,
    fetchList,
    openCreate,
    openEdit,
    closeForm,
    handleReorder,
    moveOrder,
    handleSave,
    handleDeleteFromForm,
    requestDelete,
    confirmDelete,
    handleBatchSuccess,
  } = useOrdensProducaoPage();

  return (
    <div className={ordensProducaoPageClass}>
      <div className={ordensProducaoContainerClass}>
        <OrdensProducaoToolbar
          filterDate={filterDate}
          onDateChange={setFilterDate}
          totalOrdens={resumo.totalOrdens}
          totalLatas={resumo.totalLatas}
          totalUnidades={resumo.totalUnidades}
          onImport={() => setBatchOpen(true)}
          onNewOrder={openCreate}
        />

        {toast ? (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 ${toast.type === 'success' ? ordensProducaoToastSuccessClass : ordensProducaoToastErrorClass}`}
          >
            {toast.text}
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${ordensProducaoToastErrorClass}`}
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void fetchList(filterDate)}
              className={ordensProducaoSecondaryButtonClass}
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

        <section aria-label="Lista de ordens de produção" className={ordensProducaoPanelClass}>
          {loading ? (
            <OrdensProducaoListSkeleton />
          ) : ordens.length === 0 ? (
            <OrdensProducaoEmptyState
              onNewOrder={openCreate}
              onImport={() => setBatchOpen(true)}
            />
          ) : (
            <OrdensProducaoList
              ordens={ordens}
              filterDate={filterDate}
              onReorder={handleReorder}
              onEdit={openEdit}
              onDelete={requestDelete}
              onMoveUp={(ordem) => moveOrder(ordem, 'up')}
              onMoveDown={(ordem) => moveOrder(ordem, 'down')}
            />
          )}
        </section>
      </div>

      <OrdemProducaoFormModal
        isOpen={formOpen}
        mode={formMode}
        filterDate={filterDate}
        initialOrder={editingOrder}
        onClose={closeForm}
        onSave={handleSave}
        onDelete={handleDeleteFromForm}
      />

      <OrdensProducaoBatchModal
        isOpen={batchOpen}
        onClose={() => setBatchOpen(false)}
        onSuccess={() => void handleBatchSuccess()}
      />

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
          role="presentation"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            role="alertdialog"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-stone-900">
              Excluir ordem?
            </h2>
            <p id="delete-dialog-desc" className="mt-2 text-sm text-stone-600">
              A ordem de <strong>{deleteTarget.produto}</strong> será removida permanentemente.
              Não é possível excluir se já houver produção registrada.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className={ordensProducaoSecondaryButtonClass}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <span className="material-icons text-base" aria-hidden="true">
                  delete
                </span>
                Excluir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
