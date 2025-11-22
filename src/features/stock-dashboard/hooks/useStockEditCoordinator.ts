import { useCallback, useEffect, useState } from 'react';
import { EstoqueRecord, Quantidade } from '@/domain/types/inventario';

export interface StockEditorTarget {
  cliente: string;
  produto: string;
  quantidade: Quantidade;
}

export interface StockEditorState {
  isOpen: boolean;
  target: StockEditorTarget | null;
  saving: boolean;
  error: string | null;
}

const createDefaultEditorState = (): StockEditorState => ({
  isOpen: false,
  target: null,
  saving: false,
  error: null,
});

export const useStockEditCoordinator = (
  initialRecords: EstoqueRecord[],
) => {
  const [records, setRecords] = useState(initialRecords);
  const [editorState, setEditorState] = useState<StockEditorState>(
    createDefaultEditorState(),
  );

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  const openEditor = useCallback((target: StockEditorTarget) => {
    setEditorState({
      isOpen: true,
      target,
      saving: false,
      error: null,
    });
  }, []);

  const closeEditor = useCallback(() => {
    setEditorState(createDefaultEditorState());
  }, []);

  const persistRecord = useCallback((record: EstoqueRecord) => {
    setRecords((current) => {
      const index = current.findIndex(
        (item) =>
          item.cliente === record.cliente && item.produto === record.produto,
      );
      if (index === -1) {
        return [...current, record];
      }
      const clone = [...current];
      clone[index] = record;
      return clone;
    });
  }, []);

  const saveQuantity = useCallback(
    async (quantidade: Quantidade): Promise<boolean> => {
      const target = editorState.target;
      if (!target) {
        return false;
      }

      setEditorState((prev) => ({ ...prev, saving: true, error: null }));

      try {
        const response = await fetch('/api/estoque/item', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente: target.cliente,
            produto: target.produto,
            quantidade,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Falha ao atualizar estoque');
        }

        persistRecord(data.data as EstoqueRecord);
        setEditorState(createDefaultEditorState());
        return true;
      } catch (error) {
        setEditorState((prev) => ({
          ...prev,
          saving: false,
          error:
            error instanceof Error
              ? error.message
              : 'Erro desconhecido ao salvar estoque',
        }));
        return false;
      }
    },
    [editorState.target, persistRecord],
  );

  return {
    records,
    editorState,
    openEditor,
    closeEditor,
    saveQuantity,
  };
};

