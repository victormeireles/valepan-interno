'use client';

import OrdensProducaoToolbar from '@/components/OrdensProducao/OrdensProducaoToolbar';
import OrdensProducaoList from '@/components/OrdensProducao/OrdensProducaoList';
import OrdensProducaoEmptyState from '@/components/OrdensProducao/OrdensProducaoEmptyState';
import OrdensProducaoListSkeleton from '@/components/OrdensProducao/OrdensProducaoListSkeleton';
import OrdemProducaoFormModal from '@/components/OrdensProducao/OrdemProducaoFormModal';
import OrdensProducaoBatchModal from '@/components/OrdensProducao/OrdensProducaoBatchModal';
import { useOrdensProducaoPage } from '@/components/OrdensProducao/useOrdensProducaoPage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';

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
    bulkDeleteOpen,
    bulkBusy,
    selectedCount,
    allSelected,
    isSelected,
    setBatchOpen,
    setDeleteTarget,
    setBulkDeleteOpen,
    fetchList,
    openCreate,
    openEdit,
    closeForm,
    handleReorder,
    moveOrder,
    moveOrderToTop,
    moveOrderToBottom,
    handleSave,
    handleDeleteFromForm,
    requestDelete,
    confirmDelete,
    requestBulkDelete,
    confirmBulkDelete,
    toggleSelectOrder,
    toggleSelectAll,
    clearSelection,
    moveSelectedToTop,
    handleBatchSuccess,
  } = useOrdensProducaoPage();

  return (
    <>
      <OrdensProducaoToolbar
        filterDate={filterDate}
        onDateChange={setFilterDate}
        totalOrdens={resumo.totalOrdens}
        totalLatas={resumo.totalLatas}
        totalUnidades={resumo.totalUnidades}
        totalCaixas={resumo.totalCaixas}
        onImport={() => setBatchOpen(true)}
        onNewOrder={openCreate}
      />

      {toast ? (
        <Toast
          tone={toast.type === 'success' ? 'success' : 'error'}
          className="mb-4"
        >
          {toast.text}
        </Toast>
      ) : null}

      {error ? (
        <Toast tone="error" className="mb-4">
          <span className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void fetchList(filterDate)}
            >
              Tentar novamente
            </Button>
          </span>
        </Toast>
      ) : null}

      <Card padding="none" className="overflow-hidden">
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
            selectedCount={selectedCount}
            allSelected={allSelected}
            isSelected={isSelected}
            onToggleSelect={toggleSelectOrder}
            onToggleSelectAll={toggleSelectAll}
            onMoveSelectedToTop={moveSelectedToTop}
            onDeleteSelected={requestBulkDelete}
            onClearSelection={clearSelection}
            bulkBusy={bulkBusy}
            onReorder={handleReorder}
            onEdit={openEdit}
            onDelete={requestDelete}
            onMoveUp={(ordem) => moveOrder(ordem, 'up')}
            onMoveDown={(ordem) => moveOrder(ordem, 'down')}
            onMoveToTop={moveOrderToTop}
            onMoveToBottom={moveOrderToBottom}
          />
        )}
      </Card>

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
            className="w-full max-w-md rounded-xl border border-border-default bg-surface p-6 shadow-control"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-text-strong">
              Excluir ordem?
            </h2>
            <p id="delete-dialog-desc" className="mt-2 text-sm text-text-muted">
              A ordem de <strong>{deleteTarget.produto}</strong> será removida permanentemente.
              Não é possível excluir se já houver produção registrada.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" icon="delete" onClick={() => void confirmDelete()}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkDeleteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
          role="presentation"
          onClick={() => !bulkBusy && setBulkDeleteOpen(false)}
        >
          <div
            role="alertdialog"
            aria-labelledby="bulk-delete-dialog-title"
            aria-describedby="bulk-delete-dialog-desc"
            className="w-full max-w-md rounded-xl border border-border-default bg-surface p-6 shadow-control"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="bulk-delete-dialog-title" className="text-lg font-semibold text-text-strong">
              Excluir ordens selecionadas?
            </h2>
            <p id="bulk-delete-dialog-desc" className="mt-2 text-sm text-text-muted">
              {selectedCount === 1
                ? '1 ordem será removida permanentemente.'
                : `${selectedCount} ordens serão removidas permanentemente.`}{' '}
              Não é possível excluir ordens com produção já registrada.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={bulkBusy}
                onClick={() => setBulkDeleteOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                icon="delete"
                disabled={bulkBusy}
                onClick={() => void confirmBulkDelete()}
              >
                Excluir selecionadas
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
