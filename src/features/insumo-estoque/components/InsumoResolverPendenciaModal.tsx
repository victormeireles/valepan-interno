'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { mesclarPendenciasNoGrupo, type InsumoPendenciaProdutoGrupo } from '@/domain/insumos/insumo-pendencia-grupo';
import {
  calcularCustoUnitarioEntrada,
  calcularQuantidadeEntrada,
} from '@/domain/insumos/insumo-entrada-calculo';
import type { InsumoPendenciaStatus } from '@/domain/types/insumo-estoque';
import { getInsumoPendenciasPorProdutoOmie, resolverInsumoPendenciaGrupo } from '@/app/actions/insumo-estoque-actions';
import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import InsumoPendenciaGrupoNfList from '@/features/insumo-estoque/components/InsumoPendenciaGrupoNfList';
import InsumoProdutoOmieHeader from '@/features/insumo-estoque/components/InsumoProdutoOmieHeader';
import InsumoResolverConversaoSection from '@/features/insumo-estoque/components/InsumoResolverConversaoSection';
import { formatInsumoQuantidade } from '@/features/insumo-estoque/utils/formatters';
import {
  formatUnidadeLabel,
  type InsumoSelecionadoResumo,
} from '@/features/insumo-estoque/utils/insumo-conversao-ui';

type Props = {
  isOpen: boolean;
  grupo: InsumoPendenciaProdutoGrupo | null;
  pendenciaStatuses: InsumoPendenciaStatus[];
  onClose: () => void;
  onSaved: (message: string) => void;
};

type InsumoOptionMeta = {
  unidadeNomeResumido?: string;
  unidadeCodigo?: string;
};

export default function InsumoResolverPendenciaModal({
  isOpen,
  grupo,
  pendenciaStatuses,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId();
  const [insumoId, setInsumoId] = useState('');
  const [insumoSelecionado, setInsumoSelecionado] = useState<InsumoSelecionadoResumo | null>(null);
  const [fatorConversao, setFatorConversao] = useState('1');
  const [loading, setLoading] = useState(false);
  const [detalhesLoading, setDetalhesLoading] = useState(false);
  const [grupoDetalhado, setGrupoDetalhado] = useState<InsumoPendenciaProdutoGrupo | null>(null);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen && grupo) {
      setAnimating(true);
      setInsumoId('');
      setInsumoSelecionado(null);
      setFatorConversao('1');
      setError('');
      setGrupoDetalhado(null);
      setDetalhesLoading(true);

      getInsumoPendenciasPorProdutoOmie({
        empresaId: grupo.empresaId,
        omieIdProduto: grupo.omieIdProduto,
        statuses: pendenciaStatuses,
      })
        .then((pendencias) => {
          setGrupoDetalhado(mesclarPendenciasNoGrupo(grupo, pendencias));
        })
        .catch(() => {
          setError('Erro ao carregar notas do produto');
        })
        .finally(() => {
          setDetalhesLoading(false);
        });
    } else if (!isOpen) {
      const timer = setTimeout(() => {
        setAnimating(false);
        setGrupoDetalhado(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, grupo, pendenciaStatuses]);

  const grupoExibicao = grupoDetalhado ?? grupo;

  const preview = useMemo(() => {
    if (!grupoExibicao) return null;
    const fator = Number(fatorConversao.replace(',', '.'));
    if (!Number.isFinite(fator) || fator <= 0) return null;

    let qtdConvertida = 0;
    let valorTotal = 0;

    if (grupoExibicao.pendencias.length > 0) {
      for (const pendencia of grupoExibicao.pendencias) {
        const qtdEntrada = calcularQuantidadeEntrada(Number(pendencia.quantidade_nf), fator);
        qtdConvertida += qtdEntrada;
        valorTotal += Number(pendencia.valor_total_item);
      }
    } else {
      qtdConvertida = calcularQuantidadeEntrada(grupoExibicao.quantidadeNfTotal, fator);
      valorTotal = grupoExibicao.valorTotal;
    }

    let custo = 0;
    try {
      custo = calcularCustoUnitarioEntrada(valorTotal, qtdConvertida);
    } catch {
      return null;
    }

    return {
      qtdNf: grupoExibicao.quantidadeNfTotal,
      fator,
      qtdConvertida,
      custo,
    };
  }, [grupoExibicao, fatorConversao]);

  if ((!isOpen && !animating) || !grupo) return null;

  const unidadeNfLabel = formatUnidadeLabel(grupo.unidadeNf, grupo.unidadeNf);
  const unidadeInsumoLabel = insumoSelecionado
    ? formatUnidadeLabel(insumoSelecionado.unidadeCodigo, insumoSelecionado.unidadeNome)
    : null;
  const fatorNumerico = Number(fatorConversao.replace(',', '.'));

  const handleInsumoSelected = (
    option: { label: string; value: string; meta?: Record<string, unknown> } | null,
  ) => {
    if (!option) {
      setInsumoSelecionado(null);
      return;
    }

    const meta = (option.meta ?? {}) as InsumoOptionMeta;
    setInsumoSelecionado({
      id: option.value,
      nome: option.label,
      unidadeCodigo: meta.unidadeCodigo ?? meta.unidadeNomeResumido ?? '',
      unidadeNome: meta.unidadeNomeResumido ?? meta.unidadeCodigo ?? '',
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const fator = Number(fatorConversao.replace(',', '.'));
    const pendenciaIds = grupo.pendenciaIds;
    const result = await resolverInsumoPendenciaGrupo(pendenciaIds, insumoId, fator);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const resolvidas = result.resolvidas ?? pendenciaIds.length;
    onSaved(
      resolvidas === 1
        ? '1 pendência resolvida e entrada registrada'
        : `${resolvidas} pendências resolvidas e entradas registradas`,
    );
    onClose();
    setLoading(false);
  };

  const submitLabel =
    grupo.pendenciaCount === 1
      ? 'Confirmar e registrar entrada'
      : `Confirmar e registrar ${grupo.pendenciaCount} entradas`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg transition-all duration-300 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
        }`}
      >
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 id={titleId} className="text-xl font-bold tracking-tight text-stone-900">
              Vincular produto Omie
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              {grupo.pendenciaCount} pendência{grupo.pendenciaCount === 1 ? '' : 's'} em{' '}
              {grupo.nfsDistintas} NF{grupo.nfsDistintas === 1 ? '' : 's'} • {grupo.empresaNome}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Fechar"
          >
            <span className="material-icons" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {error ? (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                <span className="material-icons text-base" aria-hidden="true">
                  error
                </span>
                {error}
              </div>
            ) : null}

            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Produto Omie
              </p>
              <InsumoProdutoOmieHeader
                categoriaTitulo={grupo.contexto.categoriaTitulo}
                categoriaSubtitulo={grupo.contexto.categoriaSubtitulo}
              />
              <p className="mt-1 font-medium text-stone-900">
                {grupo.descricaoProduto || 'Produto sem descrição'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-base tabular-nums text-stone-900">
                  {formatInsumoQuantidade(grupo.quantidadeNfTotal, unidadeNfLabel)} no total
                </span>
                <Badge tone="neutral" numeric>
                  {unidadeNfLabel}
                </Badge>
              </div>
              {grupo.contexto.fornecedoresDistintos > 0 ? (
                <p className="mt-2 text-xs text-stone-600">
                  <span className="font-medium text-stone-800">{grupo.contexto.fornecedorTitulo}</span>
                  {grupo.contexto.fornecedorSubtitulo ? (
                    <span className="text-stone-500"> • {grupo.contexto.fornecedorSubtitulo}</span>
                  ) : null}
                </p>
              ) : null}
              {(grupo.contexto.cfop || grupo.contexto.ncm) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {grupo.contexto.cfop ? (
                    <Badge tone="outline" pill={false}>
                      CFOP {grupo.contexto.cfop}
                    </Badge>
                  ) : null}
                  {grupo.contexto.ncm ? (
                    <Badge tone="outline" pill={false}>
                      NCM {grupo.contexto.ncm}
                    </Badge>
                  ) : null}
                </div>
              )}
              <p className="mt-2 text-xs text-stone-500">
                O mesmo vínculo e fator serão aplicados a todas as NFs deste produto.
              </p>
            </div>

            <SelectRemoteAutocomplete
              value={insumoId}
              onChange={setInsumoId}
              onOptionSelected={handleInsumoSelected}
              stage="insumos"
              label="Insumo no estoque"
              placeholder="Buscar insumo..."
              required
            />

            <InsumoResolverConversaoSection
              unidadeNf={grupo.unidadeNf}
              descricaoOmie={grupo.descricaoProduto ?? ''}
              insumo={insumoSelecionado}
              fatorConversao={fatorConversao}
              onFatorChange={setFatorConversao}
              preview={preview}
              previewLabel="Total no estoque"
            />

            <InsumoPendenciaGrupoNfList
              grupo={grupoExibicao ?? grupo}
              fator={Number.isFinite(fatorNumerico) ? fatorNumerico : 0}
              unidadeInsumoLabel={unidadeInsumoLabel}
              loading={detalhesLoading}
            />
          </div>

          <div className="flex gap-3 border-t border-stone-100 px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !insumoId}>
              {loading ? 'Registrando…' : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
