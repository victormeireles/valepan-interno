'use client';

import { useCallback, useState } from 'react';
import { fetchInsumoCatalogo } from '@/domain/receitas/receita-insumo-catalogo';
import { matchLinhasComCatalogo } from '@/domain/receitas/receita-insumo-matcher';
import type { InsumoCatalogoItem } from '@/domain/insumos/insumo-vinculo-sugestao';
import type {
  ReceitaImportLinhaRevisao,
  ReceitaPlanilhaLinhaParseada,
} from '@/domain/receitas/receita-planilha-types';
import type { ReceitaIngredienteFormItem } from '@/components/Receitas/ReceitaIngredienteRow';

export type ReceitaImportPhase = 'idle' | 'paste' | 'review';

type Params = {
  ingredientes: ReceitaIngredienteFormItem[];
  generateTempId: () => string;
  onIngredientesChange: (updater: (prev: ReceitaIngredienteFormItem[]) => ReceitaIngredienteFormItem[]) => void;
  onError: (message: string) => void;
  onClearError: () => void;
  onAccordionOpen: () => void;
};

export function useReceitaImportFlow({
  ingredientes,
  generateTempId,
  onIngredientesChange,
  onError,
  onClearError,
  onAccordionOpen,
}: Params) {
  const [importPhase, setImportPhase] = useState<ReceitaImportPhase>('idle');
  const [importRows, setImportRows] = useState<ReceitaImportLinhaRevisao[]>([]);
  const [catalogo, setCatalogo] = useState<InsumoCatalogoItem[]>([]);
  const [catalogoLoading, setCatalogoLoading] = useState(false);

  const resetImport = useCallback(() => {
    setImportPhase('idle');
    setImportRows([]);
    setCatalogo([]);
  }, []);

  const handleStartColarPlanilha = async () => {
    onClearError();
    setCatalogoLoading(true);
    try {
      const cat = await fetchInsumoCatalogo();
      setCatalogo(cat);
      setImportPhase('paste');
      onAccordionOpen();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Falha ao carregar insumos');
    } finally {
      setCatalogoLoading(false);
    }
  };

  const handlePasteContinue = (linhas: ReceitaPlanilhaLinhaParseada[]) => {
    const usedIds = new Set(ingredientes.map((item) => item.insumoId));
    setImportRows(matchLinhasComCatalogo(linhas, catalogo, usedIds));
    setImportPhase('review');
  };

  const handleImportConfirm = () => {
    const novos = importRows
      .filter((row) => !row.skippedDuplicate && row.insumoId)
      .map((row) => ({
        tempId: generateTempId(),
        insumoId: row.insumoId as string,
        insumoNome: row.insumoNome ?? 'Ingrediente',
        unidadeDescricao: row.unidadeDescricao,
        quantidade: row.quantidade,
      }));

    onIngredientesChange((prev) => [...prev, ...novos]);
    resetImport();
    onClearError();
  };

  return {
    importPhase,
    importRows,
    catalogoLoading,
    setImportPhase,
    setImportRows,
    resetImport,
    handleStartColarPlanilha,
    handlePasteContinue,
    handleImportConfirm,
  };
}
