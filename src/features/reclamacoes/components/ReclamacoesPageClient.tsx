'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteReclamacao,
  listReclamacoes,
  type ReclamacaoFormOpcoes,
} from '@/app/actions/reclamacao-actions';
import OverflowMenu from '@/components/OverflowMenu/OverflowMenu';
import OverflowMenuItem from '@/components/OverflowMenu/OverflowMenuItem';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { Toast } from '@/components/ui/Toast';
import { Toolbar } from '@/components/ui/Toolbar';
import { formatarDataIsoPtBr } from '@/domain/reclamacoes/reclamacao-data';
import {
  RECLAMACAO_FILTRO_VAZIO,
  type ReclamacaoListFiltro,
  type ReclamacaoListItem,
} from '@/domain/reclamacoes/reclamacao-types';
import { formatarReclamacaoQuantidade } from '@/domain/reclamacoes/reclamacao-unidade';
import { categoriasDoFiltro } from '@/features/reclamacoes/reclamacao-form-options';
import {
  CONFIRMAR_EXCLUIR_RECLAMACAO,
  EMPTY_RECLAMACOES,
  ERRO_SALVAR_RECLAMACAO,
  TOAST_RECLAMACAO_ATUALIZADA,
  TOAST_RECLAMACAO_EXCLUIDA,
  TOAST_RECLAMACAO_REGISTRADA,
} from '@/domain/reclamacoes/reclamacao-mensagens';
import ReclamacaoFiltros from '@/features/reclamacoes/components/ReclamacaoFiltros';
import ReclamacaoModal from '@/features/reclamacoes/components/ReclamacaoModal';

type Props = {
  initialItens: ReclamacaoListItem[];
  opcoes: ReclamacaoFormOpcoes;
};

type ToastState = { tone: 'success' | 'error'; text: string } | null;

export default function ReclamacoesPageClient({ initialItens, opcoes }: Props) {
  const router = useRouter();
  const [itens, setItens] = useState(initialItens);
  const [filtro, setFiltro] = useState<ReclamacaoListFiltro>(RECLAMACAO_FILTRO_VAZIO);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReclamacaoListItem | undefined>();
  const [toast, setToast] = useState<ToastState>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const vazio =
      !filtro.clienteId &&
      !filtro.produtoId &&
      !filtro.categoriaId &&
      !filtro.dataProblemaDe &&
      !filtro.dataProblemaAte;
    if (vazio) {
      setItens(initialItens);
      return;
    }
    let cancelled = false;
    void listReclamacoes(filtro).then((next) => {
      if (!cancelled) setItens(next);
    });
    return () => {
      cancelled = true;
    };
  }, [filtro, initialItens]);

  const categoriasFiltro = useMemo(
    () =>
      categoriasDoFiltro(
        opcoes.categorias.map((c) => ({ id: c.id, nome: c.nome })),
        initialItens,
      ),
    [opcoes.categorias, initialItens],
  );

  const showToast = (tone: 'success' | 'error', text: string) => {
    setToast({ tone, text });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreate = () => {
    setEditing(undefined);
    setModalOpen(true);
  };

  const openEdit = (item: ReclamacaoListItem) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleSaved = (mode: 'create' | 'update') => {
    showToast(
      'success',
      mode === 'create' ? TOAST_RECLAMACAO_REGISTRADA : TOAST_RECLAMACAO_ATUALIZADA,
    );
    router.refresh();
  };

  const handleDelete = async (item: ReclamacaoListItem) => {
    if (!window.confirm(CONFIRMAR_EXCLUIR_RECLAMACAO)) return;
    setDeletingId(item.id);
    try {
      const result = await deleteReclamacao(item.id);
      if (!result.success) {
        showToast('error', result.error);
        return;
      }
      showToast('success', TOAST_RECLAMACAO_EXCLUIDA);
      router.refresh();
    } catch {
      showToast('error', ERRO_SALVAR_RECLAMACAO);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <Toolbar
        title="Reclamações"
        sticky={false}
        actions={
          <Button icon="add" size="lg" onClick={openCreate}>
            Nova reclamação
          </Button>
        }
      />

      <div className="mt-4">
        <ReclamacaoFiltros
          filtro={filtro}
          clientes={opcoes.clientes}
          produtos={opcoes.produtos}
          categorias={categoriasFiltro}
          onChange={setFiltro}
        />
      </div>

      {toast ? (
        <div className="mt-4">
          <Toast tone={toast.tone} onClose={() => setToast(null)}>
            {toast.text}
          </Toast>
        </div>
      ) : null}

      <Card padding="none" className="mt-4 overflow-hidden" aria-label="Lista de reclamações">
        {itens.length === 0 ? (
          <EmptyState
            icon="report_problem"
            title={EMPTY_RECLAMACOES}
            action={
              <Button icon="add" onClick={openCreate}>
                Nova reclamação
              </Button>
            }
          />
        ) : (
          itens.map((item, index) => (
            <ListRow
              key={item.id}
              even={index % 2 === 1}
              title={item.clienteNome}
              subtitle={`${item.produtoNome} · ${item.categoriaNome}`}
              onClick={() => openEdit(item)}
              columns={[
                { value: formatarDataIsoPtBr(item.dataProblema), width: '6.5rem' },
                {
                  value: formatarReclamacaoQuantidade(item.quantidade, item.unidade),
                  width: '7.5rem',
                  emphasize: true,
                },
                { value: formatarDataIsoPtBr(item.dataFabricacao), width: '6.5rem' },
                {
                  value:
                    item.fotos.length > 0 ? (
                      <span className="material-icons text-xl text-stone-500" aria-hidden>
                        photo
                      </span>
                    ) : (
                      '\u00a0'
                    ),
                  width: '2rem',
                },
              ]}
              menu={
                <OverflowMenu ariaLabel={`Ações para ${item.clienteNome}`} menuWidth={160}>
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
              }
            />
          ))
        )}
      </Card>

      <ReclamacaoModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(undefined);
        }}
        reclamacao={editing}
        clientes={opcoes.clientes}
        produtos={opcoes.produtos}
        categoriasAtivas={opcoes.categorias}
        onSaved={handleSaved}
        onSaveError={(message) => showToast('error', message)}
      />
    </div>
  );
}
