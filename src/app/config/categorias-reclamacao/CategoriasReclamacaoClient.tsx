'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteReclamacaoCategoria,
} from '@/app/actions/reclamacao-categoria-actions';
import type { ReclamacaoCategoriaRecord } from '@/domain/reclamacoes/reclamacao-types';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import OverflowMenu from '@/components/OverflowMenu/OverflowMenu';
import OverflowMenuItem from '@/components/OverflowMenu/OverflowMenuItem';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toast } from '@/components/ui/Toast';
import CategoriaReclamacaoModal from './CategoriaReclamacaoModal';

type Props = {
  initialCategorias: ReclamacaoCategoriaRecord[];
};

type ToastState = { tone: 'success' | 'error'; text: string } | null;

export default function CategoriasReclamacaoClient({ initialCategorias }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReclamacaoCategoriaRecord | undefined>();
  const [toast, setToast] = useState<ToastState>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(undefined);
    setModalOpen(true);
  };

  const openEdit = (item: ReclamacaoCategoriaRecord) => {
    setEditing(item);
    setModalOpen(true);
  };

  const showToast = (tone: 'success' | 'error', text: string) => {
    setToast({ tone, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaved = () => {
    showToast('success', 'Categoria salva com sucesso.');
    router.refresh();
  };

  const handleDelete = async (item: ReclamacaoCategoriaRecord) => {
    if (!confirm('Excluir esta categoria?')) return;

    setDeletingId(item.id);
    try {
      const result = await deleteReclamacaoCategoria(item.id);
      if (!result.success) {
        showToast('error', result.error);
        return;
      }
      showToast('success', 'Categoria excluída.');
      router.refresh();
    } catch (error: unknown) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Erro ao excluir categoria',
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <ConfigPageHeader
        title="Categorias de reclamação"
        icon="report_problem"
        description="Tipos de problema no caderno de reclamações."
        action={
          <Button icon="add" onClick={openCreate} className="w-full sm:w-auto">
            Nova categoria
          </Button>
        }
      />

      {toast ? (
        <Toast tone={toast.tone} onClose={() => setToast(null)}>
          {toast.text}
        </Toast>
      ) : null}

      <Card
        padding="none"
        aria-label="Lista de categorias de reclamação"
        className="overflow-hidden"
      >
        {initialCategorias.length === 0 ? (
          <EmptyState
            icon="report_problem"
            title="Nenhuma categoria cadastrada"
            description="Crie a primeira categoria para classificar reclamações."
            action={
              <Button icon="add" onClick={openCreate}>
                Nova categoria
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-stone-100">
            {initialCategorias.map((item) => (
              <li key={item.id}>
                <div className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-amber-50/50">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="min-h-11 min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <span className="block font-medium text-stone-900">{item.nome}</span>
                    <p className="mt-1 text-xs text-stone-500">
                      <span className="font-mono tabular-nums">Ordem {item.ordem}</span>
                      {item.exigeObservacao ? (
                        <span className="ml-2">· Exige observação</span>
                      ) : null}
                    </p>
                  </button>

                  <Chip
                    active={item.ativa}
                    onClick={() => openEdit(item)}
                    aria-label={item.ativa ? 'Ativa' : 'Inativa'}
                  >
                    {item.ativa ? 'Ativa' : 'Inativa'}
                  </Chip>

                  <OverflowMenu ariaLabel={`Ações para ${item.nome}`} menuWidth={160}>
                    <OverflowMenuItem
                      label="Editar"
                      icon="edit"
                      onClick={() => openEdit(item)}
                    />
                    <OverflowMenuItem
                      label="Excluir"
                      icon="delete"
                      tone="danger"
                      disabled={deletingId === item.id}
                      onClick={() => {
                        void handleDelete(item);
                      }}
                    />
                  </OverflowMenu>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <CategoriaReclamacaoModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(undefined);
        }}
        categoria={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
