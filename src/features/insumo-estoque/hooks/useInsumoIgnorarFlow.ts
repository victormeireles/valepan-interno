'use client';

import { useCallback, useState } from 'react';
import { marcarFornecedorIgnorado } from '@/app/actions/insumo-fornecedor-ignorado-actions';
import { ignorarInsumoPendenciasEmLote } from '@/app/actions/insumo-estoque-actions';
import { formatarCnpj } from '@/domain/insumos/insumo-cnpj';
import { resolverCnpjUnicoDoGrupo } from '@/domain/insumos/insumo-fornecedor-cnpj-grupo';
import {
  collectPendenciaIdsFromGrupos,
  type InsumoPendenciaProdutoGrupo,
} from '@/domain/insumos/insumo-pendencia-grupo';
import type { InsumoIgnorarConfirmModo } from '@/features/insumo-estoque/components/InsumoIgnorarConfirmDialog';

type DialogState = {
  open: boolean;
  modo: InsumoIgnorarConfirmModo;
  produtoLabel: string;
  fornecedorLabel: string | null;
  pendenciaCount: number;
};

type PendingIgnorar =
  | { kind: 'single'; grupo: InsumoPendenciaProdutoGrupo; cnpj: string | null }
  | {
      kind: 'batch';
      grupos: InsumoPendenciaProdutoGrupo[];
      ids: string[];
      cnpj: string | null;
      empresaId: string;
    };

type UseInsumoIgnorarFlowArgs = {
  pendenciaGrupos: InsumoPendenciaProdutoGrupo[];
  selectionGrupos: InsumoPendenciaProdutoGrupo[];
  selectedKeys: Set<string>;
  selectedGrupoCount: number;
  selectedPendenciaCount: number;
  clearSelection: () => void;
  removeFromSelection: (chaves: string[]) => void;
  moverGrupoParaIgnoradas: (grupo: InsumoPendenciaProdutoGrupo) => void;
  moverGruposParaIgnoradas: (grupos: InsumoPendenciaProdutoGrupo[]) => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
  onRefresh: () => void;
};

const DIALOG_FECHADO: DialogState = {
  open: false,
  modo: 'produto',
  produtoLabel: '',
  fornecedorLabel: null,
  pendenciaCount: 0,
};

function rotuloProduto(grupo: InsumoPendenciaProdutoGrupo): string {
  return grupo.descricaoProduto?.trim() || `Produto ${grupo.omieIdProduto}`;
}

function rotuloFornecedor(cnpj: string, grupo: InsumoPendenciaProdutoGrupo): string {
  const nome = grupo.contexto.fornecedores[0]?.label?.trim() || 'Fornecedor';
  return `${nome} (${formatarCnpj(cnpj)})`;
}

/** CNPJ único compartilhado por todos os grupos (mesma empresa). */
export function resolverCnpjBatchCompartilhado(
  grupos: InsumoPendenciaProdutoGrupo[],
): { cnpj: string; empresaId: string } | null {
  if (grupos.length === 0) return null;
  const primeiro = resolverCnpjUnicoDoGrupo(grupos[0]!);
  if (!primeiro) return null;
  const empresaId = grupos[0]!.empresaId;
  for (const grupo of grupos) {
    if (grupo.empresaId !== empresaId) return null;
    if (resolverCnpjUnicoDoGrupo(grupo) !== primeiro) return null;
  }
  return { cnpj: primeiro, empresaId };
}

export function useInsumoIgnorarFlow({
  pendenciaGrupos,
  selectionGrupos,
  selectedKeys,
  selectedGrupoCount,
  selectedPendenciaCount,
  clearSelection,
  removeFromSelection,
  moverGrupoParaIgnoradas,
  moverGruposParaIgnoradas,
  onSaved,
  onError,
  onRefresh,
}: UseInsumoIgnorarFlowArgs) {
  const [dialog, setDialog] = useState<DialogState>(DIALOG_FECHADO);
  const [pending, setPending] = useState<PendingIgnorar | null>(null);
  const [busy, setBusy] = useState(false);

  const fechar = useCallback(() => {
    if (busy) return;
    setDialog(DIALOG_FECHADO);
    setPending(null);
  }, [busy]);

  const solicitarIgnorarGrupo = useCallback((grupo: InsumoPendenciaProdutoGrupo) => {
    const cnpj = resolverCnpjUnicoDoGrupo(grupo);
    setPending({ kind: 'single', grupo, cnpj });
    setDialog({
      open: true,
      modo: cnpj ? 'produto-ou-fornecedor' : 'produto',
      produtoLabel: rotuloProduto(grupo),
      fornecedorLabel: cnpj ? rotuloFornecedor(cnpj, grupo) : null,
      pendenciaCount: grupo.pendenciaCount,
    });
  }, []);

  const solicitarIgnorarBatch = useCallback(() => {
    if (selectedGrupoCount === 0) return;
    const grupos = selectionGrupos.filter((grupo) => selectedKeys.has(grupo.chave));
    const ids = collectPendenciaIdsFromGrupos(selectionGrupos, selectedKeys);
    const compartilhado = resolverCnpjBatchCompartilhado(grupos);
    const produtoLabel =
      grupos.length === 1 ? rotuloProduto(grupos[0]!) : `${grupos.length} produtos`;

    setPending({
      kind: 'batch',
      grupos,
      ids,
      cnpj: compartilhado?.cnpj ?? null,
      empresaId: compartilhado?.empresaId ?? grupos[0]!.empresaId,
    });
    setDialog({
      open: true,
      modo: compartilhado ? 'produto-ou-fornecedor' : 'produto',
      produtoLabel,
      fornecedorLabel: compartilhado
        ? rotuloFornecedor(compartilhado.cnpj, grupos[0]!)
        : null,
      pendenciaCount: selectedPendenciaCount,
    });
  }, [selectedGrupoCount, selectedKeys, selectedPendenciaCount, selectionGrupos]);

  const confirmarProduto = useCallback(async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const ids =
        pending.kind === 'single' ? pending.grupo.pendenciaIds : pending.ids;
      const result = await ignorarInsumoPendenciasEmLote(ids);
      if (!result.success) {
        setDialog(DIALOG_FECHADO);
        setPending(null);
        onError(result.error);
        return;
      }

      if (pending.kind === 'single') {
        moverGrupoParaIgnoradas(pending.grupo);
        removeFromSelection([pending.grupo.chave]);
        onSaved(
          pending.grupo.pendenciaCount === 1
            ? 'Pendência ignorada'
            : `${result.ignoradas ?? pending.grupo.pendenciaCount} pendências ignoradas`,
        );
      } else {
        moverGruposParaIgnoradas(pending.grupos);
        clearSelection();
        onSaved(
          (result.ignoradas ?? ids.length) === 1
            ? '1 pendência ignorada'
            : `${result.ignoradas ?? ids.length} pendências ignoradas`,
        );
      }
      setDialog(DIALOG_FECHADO);
      setPending(null);
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    clearSelection,
    moverGrupoParaIgnoradas,
    moverGruposParaIgnoradas,
    onError,
    onSaved,
    pending,
    removeFromSelection,
  ]);

  const confirmarFornecedor = useCallback(async () => {
    if (!pending?.cnpj || busy) return;
    setBusy(true);
    try {
      const grupoRef = pending.kind === 'single' ? pending.grupo : pending.grupos[0]!;
      const empresaId =
        pending.kind === 'single' ? pending.grupo.empresaId : pending.empresaId;
      const nome = grupoRef.contexto.fornecedores[0]?.label ?? null;

      const result = await marcarFornecedorIgnorado({
        empresaId,
        cnpj: pending.cnpj,
        nome,
        razao: null,
      });

      if (!result.success) {
        setDialog(DIALOG_FECHADO);
        setPending(null);
        onError(result.error);
        return;
      }

      const cnpj = pending.cnpj;
      const afetados = pendenciaGrupos.filter(
        (grupo) =>
          grupo.empresaId === empresaId && resolverCnpjUnicoDoGrupo(grupo) === cnpj,
      );

      moverGruposParaIgnoradas(afetados.length > 0 ? afetados : [grupoRef]);
      clearSelection();
      onSaved(
        result.pendenciasIgnoradas === 1
          ? 'Fornecedor ignorado • 1 pendência'
          : `Fornecedor ignorado • ${result.pendenciasIgnoradas} pendências`,
      );
      setDialog(DIALOG_FECHADO);
      setPending(null);
      onRefresh();
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    clearSelection,
    moverGruposParaIgnoradas,
    onError,
    onRefresh,
    onSaved,
    pendenciaGrupos,
    pending,
  ]);

  return {
    dialog,
    busy,
    fechar,
    solicitarIgnorarGrupo,
    solicitarIgnorarBatch,
    confirmarProduto,
    confirmarFornecedor,
  };
}
