'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type {
  InsumoVinculoLoteItem,
  InsumoVinculoSugestaoGrupo,
  InsumoVinculoSugestaoResultado,
} from '@/domain/insumos/insumo-vinculo-sugestao';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import InsumoVinculoIaRevisaoRow from '@/features/insumo-estoque/components/InsumoVinculoIaRevisaoRow';

type Filtro = 'todas' | 'alta' | 'revisar' | 'ignorar' | 'sem';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApplied: (message: string) => void;
};

function grupoKey(grupo: InsumoVinculoSugestaoGrupo): string {
  return `${grupo.chave.empresaId}:${grupo.chave.omieIdProduto}`;
}

function matchesFiltro(grupo: InsumoVinculoSugestaoGrupo, filtro: Filtro): boolean {
  if (filtro === 'todas') return true;
  if (filtro === 'alta') return grupo.sugestao.confianca >= 90 && grupo.sugestao.acao === 'vincular';
  if (filtro === 'revisar') return grupo.sugestao.acao === 'revisar';
  if (filtro === 'ignorar') return grupo.sugestao.acao === 'ignorar';
  return grupo.sugestao.fonte === 'nenhuma';
}

function toLoteItem(grupo: InsumoVinculoSugestaoGrupo): InsumoVinculoLoteItem | null {
  if (grupo.sugestao.acao === 'ignorar') {
    return {
      empresaId: grupo.chave.empresaId,
      omieIdProduto: grupo.chave.omieIdProduto,
      acao: 'ignorar',
      pendenciaIds: grupo.pendenciaIds,
    };
  }

  if (
    grupo.sugestao.acao !== 'vincular' ||
    !grupo.sugestao.insumoId ||
    !grupo.sugestao.fatorConversao
  ) {
    return null;
  }

  return {
    empresaId: grupo.chave.empresaId,
    omieIdProduto: grupo.chave.omieIdProduto,
    acao: 'vincular',
    insumoId: grupo.sugestao.insumoId,
    fatorConversao: grupo.sugestao.fatorConversao,
    pendenciaIds: grupo.pendenciaIds,
  };
}

function ResumoTile({
  label,
  count,
  icon,
  className,
}: {
  label: string;
  count: number;
  icon: string;
  className: string;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide opacity-90">
        <span className="material-icons text-sm" aria-hidden="true">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-0.5 font-mono text-xl font-bold tabular-nums">{count}</div>
    </div>
  );
}

export default function InsumoVinculoIaRevisaoModal({ isOpen, onClose, onApplied }: Props) {
  const titleId = useId();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<InsumoVinculoSugestaoResultado | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const reset = useCallback(() => {
    setLoading(false);
    setApplying(false);
    setError('');
    setResultado(null);
    setSelectedKeys(new Set());
    setFiltro('todas');
  }, []);

  const carregarSugestoes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/insumos/pendencias/sugerir', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar sugestões');
      const parsed = data as InsumoVinculoSugestaoResultado;
      setResultado(parsed);

      const autoSelect = new Set(
        parsed.grupos
          .filter((grupo) => grupo.sugestao.confianca >= 90 && grupo.sugestao.acao === 'vincular')
          .map(grupoKey),
      );
      const ignorarSelect = parsed.grupos
        .filter((grupo) => grupo.sugestao.acao === 'ignorar' && grupo.sugestao.confianca >= 85)
        .map(grupoKey);
      ignorarSelect.forEach((key) => autoSelect.add(key));
      setSelectedKeys(autoSelect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar sugestões');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void carregarSugestoes();
    } else {
      reset();
    }
  }, [isOpen, carregarSugestoes, reset]);

  const gruposFiltrados = useMemo(() => {
    if (!resultado) return [];
    return resultado.grupos.filter((grupo) => matchesFiltro(grupo, filtro));
  }, [resultado, filtro]);

  const selectedCount = selectedKeys.size;
  const pendenciasSelecionadas = useMemo(() => {
    if (!resultado) return 0;
    return resultado.grupos
      .filter((grupo) => selectedKeys.has(grupoKey(grupo)))
      .reduce((sum, grupo) => sum + grupo.pendenciaCount, 0);
  }, [resultado, selectedKeys]);

  const toggleGrupo = (grupo: InsumoVinculoSugestaoGrupo) => {
    const key = grupoKey(grupo);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selecionarAltaConfianca = () => {
    if (!resultado) return;
    setSelectedKeys(
      new Set(
        resultado.grupos
          .filter((grupo) => grupo.sugestao.confianca >= 90)
          .map(grupoKey),
      ),
    );
  };

  const handleApply = async () => {
    if (!resultado || selectedKeys.size === 0) return;

    const confirmado = window.confirm(
      `Aplicar ${selectedCount} vínculos e resolver ${pendenciasSelecionadas} pendências?`,
    );
    if (!confirmado) return;

    const itens = resultado.grupos
      .filter((grupo) => selectedKeys.has(grupoKey(grupo)))
      .map(toLoteItem)
      .filter((item): item is InsumoVinculoLoteItem => item !== null);

    if (itens.length === 0) {
      setError('Nenhum item selecionado pode ser aplicado automaticamente. Revise insumo e fator.');
      return;
    }

    setApplying(true);
    setError('');
    try {
      const res = await fetch('/api/insumos/pendencias/aplicar-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao aplicar lote');

      const mensagem = `${data.aplicados} vínculos aplicados • ${data.pendenciasResolvidas} pendências resolvidas`;
      onApplied(mensagem);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aplicar lote');
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={() => !loading && !applying && onClose()}
        aria-hidden="true"
      />

      <div className="relative flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-stone-200 bg-white shadow-lg sm:rounded-2xl">
        <header className="border-b border-stone-100 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-xl font-bold tracking-tight text-stone-900">
                Sugestões de vínculo
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Revise antes de aplicar. Cada linha afeta todas as pendências daquele produto Omie.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading || applying}
              aria-label="Fechar"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <span className="material-icons" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3" role="status" aria-live="polite">
              <p className="text-sm text-stone-600">Analisando produtos Omie com IA…</p>
              <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-amber-500" />
              </div>
            </div>
          ) : null}

          {resultado ? (
            <div className="space-y-4">
              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                role="status"
                aria-live="polite"
              >
                <ResumoTile
                  label="Vincular"
                  count={resultado.resumo.vincular}
                  icon="check_circle"
                  className="border-emerald-200 bg-emerald-50 text-emerald-900"
                />
                <ResumoTile
                  label="Ignorar"
                  count={resultado.resumo.ignorar}
                  icon="block"
                  className="border-stone-200 bg-stone-50 text-stone-800"
                />
                <ResumoTile
                  label="Revisar"
                  count={resultado.resumo.revisar}
                  icon="warning"
                  className="border-amber-200 bg-amber-50 text-amber-900"
                />
                <ResumoTile
                  label="Sem sugestão"
                  count={resultado.resumo.semSugestao}
                  icon="help_outline"
                  className="border-stone-200 bg-stone-50 text-stone-700"
                />
              </div>

              <p className="font-mono text-sm tabular-nums text-stone-500">
                {resultado.produtosUnicos} produtos únicos • {resultado.pendenciasAfetadas} pendências
              </p>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['todas', 'Todas'],
                    ['alta', 'Alta confiança'],
                    ['revisar', 'Revisar'],
                    ['ignorar', 'Ignorar sugerido'],
                    ['sem', 'Sem sugestão'],
                  ] as const
                ).map(([id, label]) => (
                  <Chip
                    key={id}
                    active={filtro === id}
                    onClick={() => setFiltro(id)}
                  >
                    {label}
                  </Chip>
                ))}
              </div>

              <div className="overflow-hidden rounded-xl border border-stone-200">
                <div className="max-h-[50vh] overflow-y-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 border-b border-stone-200 bg-stone-50">
                      <tr>
                        <th className="px-3 py-2 text-left">
                          <span className="sr-only">Selecionar</span>
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                          Produto Omie
                        </th>
                        <th className="hidden px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500 md:table-cell">
                          Unid.
                        </th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                          Pend.
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                          Sugestão
                        </th>
                        <th className="hidden px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-500 sm:table-cell">
                          Fator
                        </th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                          Conf.
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                          Ação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {gruposFiltrados.map((grupo) => (
                        <InsumoVinculoIaRevisaoRow
                          key={grupoKey(grupo)}
                          grupo={grupo}
                          selected={selectedKeys.has(grupoKey(grupo))}
                          onToggle={() => toggleGrupo(grupo)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              <span className="material-icons text-base" aria-hidden="true">
                error
              </span>
              {error}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={selecionarAltaConfianca} disabled={loading || applying || !resultado}>
            Selecionar ≥90%
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="secondary" onClick={onClose} disabled={loading || applying}>
              Cancelar
            </Button>
            <Button
              icon="check"
              onClick={handleApply}
              disabled={loading || applying || selectedCount === 0}
            >
              {applying ? 'Aplicando…' : `Aplicar ${selectedCount} selecionados`}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
