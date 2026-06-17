'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OrdemProducaoPainelItem } from '@/domain/types/ordens-producao-painel';
import {
  deriveQuantidadesFromAssadeiras,
  deriveQuantidadesFromUnidades,
} from '@/domain/producao/ordem-derivados';
import { formatOrdemQuantidadeLabel } from '@/domain/ordens-producao/ordem-quantidade-label';
import type { OrdemProducaoCreateBody } from '@/lib/managers/ordens-producao-list-manager';
import {
  usePedidoItemModoEntrada,
  type AssadeiraOption,
} from '@/components/CreatePedidoModal/usePedidoItemModoEntrada';

const FORM_INDEX = 0;

export type OrdemProducaoFormMode = 'create' | 'edit';

type UseOrdemProducaoFormParams = {
  isOpen: boolean;
  mode: OrdemProducaoFormMode;
  filterDate: string;
  initialOrder?: OrdemProducaoPainelItem;
  onSave: (body: OrdemProducaoCreateBody, mode: OrdemProducaoFormMode, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

type FormState = {
  dataProducao: string;
  dataEtiqueta: string;
  tipoEstoque: string;
  produto: string;
  observacao: string;
  latas: number;
  unidades: number;
  assadeiraId: string;
};

function createEmptyForm(filterDate: string): FormState {
  return {
    dataProducao: filterDate,
    dataEtiqueta: filterDate,
    tipoEstoque: '',
    produto: '',
    observacao: '',
    latas: 0,
    unidades: 0,
    assadeiraId: '',
  };
}

function formFromOrder(order: OrdemProducaoPainelItem): FormState {
  return {
    dataProducao: order.dataProducao,
    dataEtiqueta: order.dataEtiqueta,
    tipoEstoque: order.tipoEstoque,
    produto: order.produto,
    observacao: order.observacao,
    latas: order.modoQuantidade === 'latas' ? order.assadeiras : 0,
    unidades: order.modoQuantidade === 'unidades' ? order.unidades : 0,
    assadeiraId: '',
  };
}

export function useOrdemProducaoForm({
  isOpen,
  mode,
  filterDate,
  initialOrder,
  onSave,
  onDelete,
}: UseOrdemProducaoFormParams) {
  const [form, setForm] = useState<FormState>(() => createEmptyForm(filterDate));
  const [tiposEstoqueOptions, setTiposEstoqueOptions] = useState<string[]>([]);
  const [produtosOptions, setProdutosOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    getState,
    resetAll,
    resetIndex,
    setLoading: setAssadeiraLoading,
    applyAssadeirasLoaded,
  } = usePedidoItemModoEntrada();

  const assadeiraState = getState(FORM_INDEX);

  const resetForm = useCallback(() => {
    setForm(createEmptyForm(filterDate));
    resetAll();
    setMessage(null);
    setConfirmDelete(false);
  }, [filterDate, resetAll]);

  const loadAssadeirasForProduto = useCallback(async (
    produtoNome: string,
    preferredAssadeiraNome?: string,
  ) => {
    if (!produtoNome.trim()) return;
    try {
      setAssadeiraLoading(FORM_INDEX, true);
      const produtoRes = await fetch(`/api/produtos/${encodeURIComponent(produtoNome)}`);
      const produtoData = await produtoRes.json();
      if (!produtoRes.ok || !produtoData?.produto?.id) {
        throw new Error(produtoData.error || 'Produto inválido');
      }

      const produtoId = produtoData.produto.id as string;
      const produtoBoxUnits = (produtoData.produto.unPorCaixa as number | undefined) ?? null;
      const assadeirasRes = await fetch(`/api/produtos/${encodeURIComponent(produtoId)}/assadeiras`);
      const assadeirasData = await assadeirasRes.json();
      if (!assadeirasRes.ok) {
        throw new Error(assadeirasData.error || 'Erro ao carregar assadeiras');
      }

      const options = (assadeirasData.assadeiras || []) as AssadeiraOption[];
      const modo = applyAssadeirasLoaded(FORM_INDEX, options, produtoBoxUnits);

      let assadeiraId = '';
      if (preferredAssadeiraNome) {
        assadeiraId = options.find((opt) => opt.nome === preferredAssadeiraNome)?.id ?? '';
      }
      if (!assadeiraId && modo === 'latas' && options.length === 1) {
        assadeiraId = options[0].id;
      }

      setForm((prev) => ({
        ...prev,
        assadeiraId,
        latas: modo === 'latas' ? prev.latas : 0,
        unidades: modo === 'unidades' ? prev.unidades : 0,
      }));
    } catch (err) {
      resetIndex(FORM_INDEX);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao carregar assadeiras do produto',
      });
    }
  }, [applyAssadeirasLoaded, resetIndex, setAssadeiraLoading]);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialOrder) {
      setForm(formFromOrder(initialOrder));
      resetAll();
      void loadAssadeirasForProduto(initialOrder.produto, initialOrder.assadeiraNome);
    } else {
      resetForm();
    }
  }, [isOpen, mode, initialOrder, resetAll, resetForm, loadAssadeirasForProduto]);

  useEffect(() => {
    if (!isOpen) return;
    const loadOptions = async () => {
      try {
        const [tiposRes, produtosRes] = await Promise.all([
          fetch('/api/options/embalagem?type=clientes'),
          fetch('/api/options/embalagem?type=produtos'),
        ]);
        const tiposData = await tiposRes.json();
        const produtosData = await produtosRes.json();
        if (tiposRes.ok) setTiposEstoqueOptions(tiposData.options || []);
        if (produtosRes.ok) setProdutosOptions(produtosData.options || []);
      } catch (err) {
        console.error('Erro ao carregar opções:', err);
      }
    };
    void loadOptions();
  }, [isOpen]);

  const handleProdutoChange = async (value: string) => {
    setForm((prev) => ({
      ...prev,
      produto: value,
      assadeiraId: '',
      latas: 0,
      unidades: 0,
    }));
    resetIndex(FORM_INDEX);
    if (produtosOptions.includes(value)) {
      await loadAssadeirasForProduto(value);
    }
  };

  const selectedAssadeira = assadeiraState.options.find((item) => item.id === form.assadeiraId);

  const previewLabel = useMemo(() => {
    if (assadeiraState.modo === 'latas' && selectedAssadeira && form.latas > 0) {
      const derived = deriveQuantidadesFromAssadeiras({
        assadeiras: form.latas,
        unidadesPorAssadeira: selectedAssadeira.unidadesPorAssadeiraEfetiva,
        boxUnits: assadeiraState.boxUnits ?? undefined,
      });
      return formatOrdemQuantidadeLabel({
        modo: 'latas',
        assadeiras: form.latas,
        unidades: derived.unidades,
        caixas: derived.caixas,
      });
    }
    if (assadeiraState.modo === 'unidades' && form.unidades > 0) {
      const derived = deriveQuantidadesFromUnidades({
        unidades: form.unidades,
        boxUnits: assadeiraState.boxUnits ?? undefined,
      });
      return formatOrdemQuantidadeLabel({
        modo: 'unidades',
        assadeiras: 0,
        unidades: derived.unidades,
        caixas: derived.caixas,
      });
    }
    return null;
  }, [assadeiraState, form.latas, form.unidades, selectedAssadeira]);

  const buildBody = (): OrdemProducaoCreateBody | null => {
    if (!form.tipoEstoque.trim() || !form.produto.trim()) return null;

    if (assadeiraState.modo === 'latas') {
      if (form.latas <= 0 || !form.assadeiraId || !selectedAssadeira) return null;
      return {
        dataProducao: form.dataProducao,
        dataEtiqueta: form.dataEtiqueta,
        tipoEstoque: form.tipoEstoque,
        produto: form.produto,
        observacao: form.observacao.trim() || undefined,
        modoQuantidade: 'latas',
        latas: form.latas,
        assadeiraNome: selectedAssadeira.nome,
      };
    }

    if (form.unidades <= 0) return null;
    return {
      dataProducao: form.dataProducao,
      dataEtiqueta: form.dataEtiqueta,
      tipoEstoque: form.tipoEstoque,
      produto: form.produto,
      observacao: form.observacao.trim() || undefined,
      modoQuantidade: 'unidades',
      unidades: form.unidades,
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const body = buildBody();
    if (!body) {
      setMessage({
        type: 'error',
        text: 'Preencha todos os campos obrigatórios com quantidade válida',
      });
      return;
    }

    try {
      setLoading(true);
      await onSave(body, mode, initialOrder?.id);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar ordem',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialOrder?.id || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      await onDelete(initialOrder.id);
    } catch (err) {
      setConfirmDelete(false);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao excluir ordem',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    setForm,
    tiposEstoqueOptions,
    produtosOptions,
    assadeiraState,
    selectedAssadeira,
    previewLabel,
    loading,
    message,
    confirmDelete,
    setConfirmDelete,
    handleProdutoChange,
    handleSubmit,
    handleDelete,
    resetForm,
  };
}
