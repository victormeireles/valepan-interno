'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { getProdutoCustoSimulacao } from '@/app/actions/produto-custo-simulador-actions';
import { PRODUTO_RECEITA_TIPO_OPTIONS } from '@/components/ProdutosConfig/produto-receita-tipo-options';
import ProdutoCustoSimuladorResultado from '@/components/ProdutosConfig/ProdutoCustoSimuladorResultado';
import ProdutoCustoSimuladorTipoRow from '@/components/ProdutosConfig/ProdutoCustoSimuladorTipoRow';
import { produtoCustoSimuladorCenario } from '@/domain/produtos/produto-custo-simulador-cenario';
import { produtoCustoUnitarioCalculo } from '@/domain/produtos/produto-custo-unitario-calculo';
import type {
  ProdutoCustoCenarioInput,
  ProdutoCustoSimulacaoPayload,
} from '@/domain/produtos/produto-custo-unitario-types';

type Props = {
  isOpen: boolean;
  produtoId: string;
  produtoNome: string;
  onClose: () => void;
};

export default function ProdutoCustoSimuladorModal({
  isOpen,
  produtoId,
  produtoNome,
  onClose,
}: Props) {
  const titleId = useId();
  const [payload, setPayload] = useState<ProdutoCustoSimulacaoPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selecao, setSelecao] = useState<ProdutoCustoCenarioInput['selecao']>({});
  const [custoOverrides, setCustoOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen) {
      setPayload(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getProdutoCustoSimulacao(produtoId)
      .then((result) => {
        if (cancelled) return;
        setLoading(false);
        if (!result.success) {
          setError(result.error);
          setPayload(null);
          return;
        }
        setPayload(result.data);
        setSelecao(produtoCustoSimuladorCenario.selecaoInicial(result.data.vinculos));
        setCustoOverrides({});
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setError('Erro ao carregar dados do simulador.');
        setPayload(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, produtoId]);

  const vinculosDepois = useMemo(() => {
    if (!payload) return [];
    return produtoCustoSimuladorCenario.montarDepois({
      vinculosAntes: payload.vinculos,
      catalogo: payload.receitasCatalogo,
      selecao,
    });
  }, [payload, selecao]);

  const comparacao = useMemo(() => {
    if (!payload) return null;
    return produtoCustoUnitarioCalculo.comparar(
      payload.vinculos,
      vinculosDepois,
      custoOverrides,
    );
  }, [payload, vinculosDepois, custoOverrides]);

  if (!isOpen) return null;

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
              Simulador de custos
            </p>
            <h2 id={titleId} className="text-lg font-bold text-gray-900 truncate">
              {payload?.produto.nome ?? produtoNome}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Estimativa de matéria-prima e embalagens. Nada é salvo ao fechar.
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

        <div className="overflow-y-auto flex-1 min-w-0 px-4 py-3 sm:px-5 sm:py-4">
          {loading ? (
            <p className="text-sm text-stone-500">Carregando…</p>
          ) : null}
          {error ? (
            <p className="text-sm text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && !error && payload && comparacao ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
                {PRODUTO_RECEITA_TIPO_OPTIONS.map((option) => {
                  const escolha = selecao[option.value];
                  const vinculoAtual = payload.vinculos.find((item) => item.tipo === option.value);
                  return (
                    <ProdutoCustoSimuladorTipoRow
                      key={option.value}
                      option={option}
                      vinculoAtivo={Boolean(vinculoAtual)}
                      receitasDisponiveis={payload.receitasCatalogo.filter(
                        (item) => item.tipo === option.value,
                      )}
                      receitaId={escolha?.receitaId ?? ''}
                      quantidade={escolha?.quantidade}
                      onReceitaChange={(receitaId) =>
                        setSelecao((prev) => ({
                          ...prev,
                          [option.value]: {
                            receitaId,
                            quantidade: prev[option.value]?.quantidade,
                          },
                        }))
                      }
                      onQuantidadeChange={(quantidade) =>
                        setSelecao((prev) => ({
                          ...prev,
                          [option.value]: {
                            receitaId: prev[option.value]?.receitaId ?? '',
                            quantidade,
                          },
                        }))
                      }
                    />
                  );
                })}
              </div>
              <ProdutoCustoSimuladorResultado comparacao={comparacao} />
            </div>
          ) : null}
        </div>

        <div className="px-4 py-3 sm:px-5 border-t border-gray-100 bg-gray-50/60 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
