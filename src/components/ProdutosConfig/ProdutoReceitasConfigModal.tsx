'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import {
  getProdutosComReceitas,
  linkReceitaAoProduto,
  unlinkProdutoReceita,
  updateProdutoReceita,
  type ProdutoResumoComReceitas,
} from '@/app/actions/produto-receitas-actions';
import type { ProdutoConfigResumo } from '@/domain/produtos/produto-config-resumo';
import ProdutoReceitaTipoRow from '@/components/ProdutosConfig/ProdutoReceitaTipoRow';
import {
  PRODUTO_RECEITA_TIPO_OPTIONS,
  type TipoReceita,
} from '@/components/ProdutosConfig/produto-receita-tipo-options';

export type ReceitaCatalogoItem = {
  id: string;
  nome: string;
  tipo: TipoReceita;
  ativo: boolean | null;
};

type Props = {
  isOpen: boolean;
  produto: ProdutoConfigResumo;
  receitasCatalogo: ReceitaCatalogoItem[];
  onClose: () => void;
  onUpdated: (
    produtoId: string,
    receitasVinculadas: ProdutoResumoComReceitas['receitas_vinculadas'],
  ) => void;
};

const primaryButtonClassName =
  'min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

export default function ProdutoReceitasConfigModal({
  isOpen,
  produto,
  receitasCatalogo,
  onClose,
  onUpdated,
}: Props) {
  const titleId = useId();
  const [localVinculadas, setLocalVinculadas] = useState(produto.receitasVinculadas);
  const [selectedReceitas, setSelectedReceitas] = useState<Partial<Record<TipoReceita, string>>>(
    {},
  );
  const [quantidades, setQuantidades] = useState<Partial<Record<TipoReceita, number>>>({});
  const [loadingTipo, setLoadingTipo] = useState<TipoReceita | 'all' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLocalVinculadas(produto.receitasVinculadas);
    const nextSelected: Partial<Record<TipoReceita, string>> = {};
    const nextQuantidades: Partial<Record<TipoReceita, number>> = {};

    PRODUTO_RECEITA_TIPO_OPTIONS.forEach((option) => {
      const vinculo = produto.receitasVinculadas[option.value];
      if (vinculo?.ativo) {
        nextSelected[option.value] = vinculo.receita_id;
        nextQuantidades[option.value] = vinculo.quantidade;
      }
    });

    setSelectedReceitas(nextSelected);
    setQuantidades(nextQuantidades);
    setMessage(null);
  }, [isOpen, produto.id, produto.receitasVinculadas]);

  const receitasPorTipo = useMemo(() => {
    return PRODUTO_RECEITA_TIPO_OPTIONS.reduce<Record<TipoReceita, ReceitaCatalogoItem[]>>(
      (acc, option) => {
        acc[option.value] = receitasCatalogo.filter(
          (receita) => receita.tipo === option.value && receita.ativo !== false,
        );
        return acc;
      },
      {} as Record<TipoReceita, ReceitaCatalogoItem[]>,
    );
  }, [receitasCatalogo]);

  const refreshLocalProduto = async () => {
    const updatedProdutos = await getProdutosComReceitas();
    const updated = updatedProdutos.find((item) => item.id === produto.id);
    if (!updated) return;

    setLocalVinculadas(updated.receitas_vinculadas);
    onUpdated(produto.id, updated.receitas_vinculadas);
  };

  const handleSaveTipo = async (tipo: TipoReceita) => {
    const option = PRODUTO_RECEITA_TIPO_OPTIONS.find((item) => item.value === tipo);
    const receitaId = selectedReceitas[tipo];
    const quantidade = quantidades[tipo];
    const vinculoExistente = localVinculadas[tipo];

    if (!receitaId) {
      setMessage(`${option?.label ?? tipo}: selecione uma receita.`);
      return;
    }

    if (!quantidade || quantidade <= 0) {
      setMessage(`${option?.label ?? tipo}: quantidade deve ser maior que zero.`);
      return;
    }

    setLoadingTipo(tipo);
    setMessage(null);

    const result =
      vinculoExistente?.ativo && vinculoExistente.receita_id === receitaId
        ? await updateProdutoReceita(vinculoExistente.id, quantidade)
        : await linkReceitaAoProduto({
            produtoId: produto.id,
            receitaId,
            quantidade,
          });

    if (!result.success) {
      setMessage(result.error || 'Erro ao salvar vínculo.');
      setLoadingTipo(null);
      return;
    }

    await refreshLocalProduto();
    setMessage(`${option?.label ?? tipo} salvo com sucesso.`);
    setLoadingTipo(null);
  };

  const handleUnlink = async (tipo: TipoReceita) => {
    const vinculo = localVinculadas[tipo];
    if (!vinculo?.ativo) return;

    setLoadingTipo(tipo);
    setMessage(null);

    const result = await unlinkProdutoReceita(vinculo.id);
    if (!result.success) {
      setMessage(result.error || 'Erro ao remover vínculo.');
      setLoadingTipo(null);
      return;
    }

    setSelectedReceitas((prev) => ({ ...prev, [tipo]: '' }));
    setQuantidades((prev) => ({ ...prev, [tipo]: undefined }));
    await refreshLocalProduto();
    setMessage('Vínculo removido.');
    setLoadingTipo(null);
  };

  const handleSaveAll = async () => {
    setLoadingTipo('all');
    setMessage(null);

    const errors: string[] = [];

    for (const option of PRODUTO_RECEITA_TIPO_OPTIONS) {
      const receitaId = selectedReceitas[option.value];
      const quantidade = quantidades[option.value];
      const vinculoExistente = localVinculadas[option.value];

      if (!receitaId) continue;

      if (!quantidade || quantidade <= 0) {
        errors.push(`${option.label}: quantidade deve ser maior que zero.`);
        continue;
      }

      const result =
        vinculoExistente?.ativo && vinculoExistente.receita_id === receitaId
          ? await updateProdutoReceita(vinculoExistente.id, quantidade)
          : await linkReceitaAoProduto({
              produtoId: produto.id,
              receitaId,
              quantidade,
            });

      if (!result.success) {
        errors.push(`${option.label}: ${result.error || 'Erro ao salvar.'}`);
      }
    }

    if (errors.length > 0) {
      setMessage(errors.join('\n'));
      setLoadingTipo(null);
      return;
    }

    await refreshLocalProduto();
    setMessage('Alterações salvas com sucesso.');
    setLoadingTipo(null);
  };

  if (!isOpen) return null;

  const isBusy = loadingTipo !== null;

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
        className="relative bg-white w-full md:max-w-4xl md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col min-w-0"
      >
        <div className="bg-gray-50/60 border-b border-gray-100 px-4 py-4 sm:px-5 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Receitas
            </p>
            <h2 id={titleId} className="text-lg font-bold text-gray-900 truncate">
              {produto.nome}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Selecione a receita e quantidade por tipo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 shrink-0 transition-colors"
          >
            <span className="material-icons text-xl" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden flex-1 min-w-0 px-4 py-3 sm:px-5 sm:py-4">
          {message && (
            <div
              role="status"
              aria-live="polite"
              className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 whitespace-pre-line"
            >
              {message}
            </div>
          )}

          <div className="hidden lg:grid lg:grid-cols-[7.5rem_minmax(0,1fr)_5.5rem_6.5rem] gap-3 px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <span>Tipo</span>
            <span>Receita</span>
            <span>Qtd</span>
            <span className="text-right pr-1">Ações</span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
            {PRODUTO_RECEITA_TIPO_OPTIONS.map((option) => {
              const vinculo = localVinculadas[option.value];
              return (
                <ProdutoReceitaTipoRow
                  key={option.value}
                  option={option}
                  vinculoAtivo={Boolean(vinculo?.ativo)}
                  receitasDisponiveis={receitasPorTipo[option.value] ?? []}
                  receitaId={selectedReceitas[option.value] || ''}
                  quantidade={quantidades[option.value]}
                  isSaving={loadingTipo === option.value}
                  isDisabled={isBusy && loadingTipo !== option.value}
                  onReceitaChange={(value) =>
                    setSelectedReceitas((prev) => ({ ...prev, [option.value]: value }))
                  }
                  onQuantidadeChange={(value) =>
                    setQuantidades((prev) => ({ ...prev, [option.value]: value }))
                  }
                  onSave={() => void handleSaveTipo(option.value)}
                  onUnlink={() => void handleUnlink(option.value)}
                />
              );
            })}
          </div>
        </div>

        <div className="px-4 py-3 sm:px-5 border-t border-gray-100 bg-gray-50/60 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="min-h-11 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => void handleSaveAll()}
            disabled={isBusy}
            className={primaryButtonClassName}
          >
            {loadingTipo === 'all' ? 'Salvando tudo…' : 'Salvar tudo'}
          </button>
        </div>
      </div>
    </div>
  );
}
