'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import ProducaoModal from '@/components/ProducaoModal';
import {
  RealizadoHeader,
  ProductCompactCard,
  ClientGroup,
  ThreeColumnLayout,
  EmbalagemDashboard,
  EmbalagemProductAccordion,
  EmbalagemPageSkeleton,
} from '@/components/Realizado';
import {
  pedidosToDashboardItems,
  snapshotsToDashboardItems,
} from '@/domain/embalagem/painel-dashboard-adapter';
import {
  resolverExibicaoCardEmbalagem,
} from '@/domain/embalagem/painel-quantidade';
import {
  splitPedidosEmbalagemEmGrupos,
  type EmbalagemPainelGroup,
} from '@/domain/embalagem/embalagem-painel-adapter';
import { hasEmbalagemQuantity } from '@/domain/realizado/embalagem-group-by-produto';
import {
  buildLoteEmbalagemDisplayEntries,
  loteToPainelItem,
  type PainelLoteItem,
} from '@/domain/realizado/painel-pedido-adapter';
import type {
  DashboardSnapshot,
  PainelPedidoEmbalagem,
} from '@/domain/types/painel-embalagem';
import { ProducaoData } from '@/domain/types';
import { getEmbalagemPhotoStatus } from '@/domain/realizado/embalagem-photo-status';
import {
  addCalendarDaysISO,
  formatLocalTimeHHmm,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';
import type { EmbalagemDashboardItem } from '@/components/Realizado/EmbalagemDashboard';

function horarioEmbalagemParaCard(item: PainelLoteItem): string | undefined {
  if (!hasEmbalagemQuantity(item)) return undefined;
  const raw = item.producaoUpdatedAt?.trim();
  if (!raw) return undefined;
  return formatLocalTimeHHmm(raw) ?? undefined;
}

function getVisibleErrorMessage(error: unknown, fallback: string): string | null {
  const message = error instanceof Error ? error.message : fallback;
  return /fail(?:ed)? to fetch/i.test(message) ? null : message;
}

function formatQuantidade(caixas: number, pacotes: number): string {
  const parts: string[] = [];
  if (caixas > 0) parts.push(`${caixas} cx`);
  if (pacotes > 0) parts.push(`${pacotes} pct`);
  return parts.length > 0 ? parts.join(' + ') : '0';
}

function renderPedidoAccordion(
  pedido: PainelPedidoEmbalagem,
  groupKey: string,
  opts: {
    renderEmbalagemLot: (pedido: PainelPedidoEmbalagem, item: PainelLoteItem) => ReactNode;
    onNovoLote: (p: PainelPedidoEmbalagem) => void;
    showNovoLote: boolean;
    productionStatusOverride?: 'not-started' | 'partial' | 'complete';
  },
) {
  const exibicao = resolverExibicaoCardEmbalagem({
    pedido: pedido.pedido,
    produzido: pedido.produzido,
    unidadePrincipal: pedido.unidade,
    produzidoScalar: pedido.produzidoScalar,
    aProduzir: pedido.aProduzir,
  });
  const instanceId = `${groupKey}|${pedido.pedidoEmbalagemId}`;

  return (
    <EmbalagemProductAccordion
      key={instanceId}
      instanceId={instanceId}
      produto={pedido.produto}
      somaProduzido={exibicao.produzido}
      somaAProduzir={exibicao.meta}
      unidade={exibicao.unidade}
      congelado={pedido.congelado === 'Sim'}
      detalhesProduzido={exibicao.detalhesProduzido}
      detalhesMeta={exibicao.detalhesMeta}
      horarioEmbalagem={
        pedido.producaoUpdatedAt
          ? formatLocalTimeHHmm(pedido.producaoUpdatedAt) ?? undefined
          : undefined
      }
      productionStatusOverride={opts.productionStatusOverride}
      onNovoLote={opts.showNovoLote ? () => opts.onNovoLote(pedido) : undefined}
      renderLots={() =>
        pedido.lotes.map((lote) =>
          opts.renderEmbalagemLot(pedido, loteToPainelItem(pedido, lote)),
        )
      }
    />
  );
}

export default function ProducaoEmbalagemPage() {
  const initialDateResolved = useRef(false);
  const [pedidos, setPedidos] = useState<PainelPedidoEmbalagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => getTodayISOInBrazilTimezone());
  const [producaoModalOpen, setProducaoModalOpen] = useState(false);
  const [isNewLoteModal, setIsNewLoteModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PainelLoteItem | null>(null);
  const [producaoLoading, setProducaoLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [deletingLoteId, setDeletingLoteId] = useState<string | null>(null);
  const [photoDropdownOpen, setPhotoDropdownOpen] = useState<string | null>(null);
  const [comparisonWeekItems, setComparisonWeekItems] = useState<EmbalagemDashboardItem[]>(
    [],
  );
  const [comparisonPrevItems, setComparisonPrevItems] = useState<EmbalagemDashboardItem[]>([]);
  const [comparisonWeekDate, setComparisonWeekDate] = useState<string>(() =>
    addCalendarDaysISO(getTodayISOInBrazilTimezone(), -7),
  );
  const [dateComparisonPrev, setDateComparisonPrev] = useState<string | null>(null);

  const applyCargaResponse = useCallback(
    (
      data: {
        pedidos: PainelPedidoEmbalagem[];
        ultimaDataComDados: string | null;
        comparacaoSemana: { date: string; items: DashboardSnapshot[] };
        comparacaoAnterior: { date: string | null; items: DashboardSnapshot[] };
      },
      currentDate: string,
    ) => {
      if (
        !initialDateResolved.current &&
        data.ultimaDataComDados &&
        data.ultimaDataComDados !== currentDate
      ) {
        initialDateResolved.current = true;
        setSelectedDate(data.ultimaDataComDados);
        return;
      }
      initialDateResolved.current = true;
      setPedidos(data.pedidos);
      setComparisonWeekDate(data.comparacaoSemana.date);
      setComparisonWeekItems(snapshotsToDashboardItems(data.comparacaoSemana.items));
      setComparisonPrevItems(snapshotsToDashboardItems(data.comparacaoAnterior.items));
      setDateComparisonPrev(data.comparacaoAnterior.date);
    },
    [],
  );

  const loadCargaEmbalagem = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      try {
        const res = await fetch(`/api/painel/embalagem/carga?date=${selectedDate}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
        applyCargaResponse(data, selectedDate);
      } catch (err) {
        if (showSpinner) {
          setMessage(getVisibleErrorMessage(err, 'Erro ao carregar o painel'));
        } else {
          console.error('Erro ao recarregar carga embalagem:', err);
        }
      } finally {
        if (showSpinner) setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, applyCargaResponse],
  );

  const refreshPedidosOnly = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/painel/embalagem?date=${selectedDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
      setPedidos((data.pedidos || []) as PainelPedidoEmbalagem[]);
    } catch (err) {
      console.error('Erro ao recarregar pedidos:', err);
    } finally {
      setRefreshing(false);
    }
  }, [selectedDate]);

  // Carrega só quando a data muda — abrir/fechar modal NÃO recarrega a tela
  useEffect(() => {
    void loadCargaEmbalagem(true);
  }, [selectedDate, loadCargaEmbalagem]);

  // Atualização em background; pausa enquanto o modal está aberto
  useEffect(() => {
    if (producaoModalOpen) return;
    const interval = setInterval(() => void refreshPedidosOnly(), 60_000);
    return () => clearInterval(interval);
  }, [selectedDate, producaoModalOpen, refreshPedidosOnly]);

  const handleEditProducao = useCallback(async (item: PainelLoteItem) => {
    if (!item.loteId) {
      setMessage('Este item não pode ser editado');
      return;
    }

    try {
      setLoadingCardId(`${item.cliente}-${item.produto}-${item.loteId}`);
      setProducaoLoading(true);
      const res = await fetch(`/api/producao/embalagem/lote/${item.loteId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados de produção');

      setIsNewLoteModal(false);
      setEditingItem({
        ...item,
        caixas: data.data.caixas || 0,
        pacotes: data.data.pacotes || 0,
        unidades: data.data.unidades || 0,
        kg: data.data.kg || 0,
        pedidoCaixas: data.data.pedidoCaixas || 0,
        pedidoPacotes: data.data.pedidoPacotes || 0,
        pedidoUnidades: data.data.pedidoUnidades || 0,
        pedidoKg: data.data.pedidoKg || 0,
        pacoteFotoUrl: data.data.pacoteFotoUrl,
        pacoteFotoId: data.data.pacoteFotoId,
        pacoteFotoUploadedAt: data.data.pacoteFotoUploadedAt,
        etiquetaFotoUrl: data.data.etiquetaFotoUrl,
        etiquetaFotoId: data.data.etiquetaFotoId,
        etiquetaFotoUploadedAt: data.data.etiquetaFotoUploadedAt,
        palletFotoUrl: data.data.palletFotoUrl,
        palletFotoId: data.data.palletFotoId,
        palletFotoUploadedAt: data.data.palletFotoUploadedAt,
        obsEmbalagem: data.data.obsEmbalagem,
      });
      setProducaoModalOpen(true);
    } catch (err) {
      setMessage(getVisibleErrorMessage(err, 'Erro ao carregar dados de produção'));
    } finally {
      setProducaoLoading(false);
      setLoadingCardId(null);
    }
  }, []);

  const handleDeleteLote = useCallback(
    async (item: PainelLoteItem) => {
      if (!item.loteId) {
        setMessage('Este lote não pode ser excluído');
        return;
      }

      const confirmado = window.confirm(
        'Excluir este lote?\n\nSerá registrada uma saída de estoque com observação de exclusão por preenchimento incorreto.',
      );
      if (!confirmado) return;

      setDeletingLoteId(item.loteId);
      setMessage(null);
      try {
        const res = await fetch(`/api/producao/embalagem/lote/${item.loteId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao excluir lote');
        await refreshPedidosOnly();
      } catch (err) {
        setMessage(getVisibleErrorMessage(err, 'Erro ao excluir lote'));
      } finally {
        setDeletingLoteId(null);
      }
    },
    [refreshPedidosOnly],
  );

  const handleNovoLote = useCallback((pedido: PainelPedidoEmbalagem) => {
    setIsNewLoteModal(true);
    setEditingItem({
      pedidoEmbalagemId: pedido.pedidoEmbalagemId,
      cliente: pedido.cliente,
      produto: pedido.produto,
      observacao: pedido.observacao,
      congelado: pedido.congelado ?? 'Não',
      unidade: pedido.unidade,
      aProduzir: pedido.aProduzir,
      produzido: 0,
      dataFabricacao: pedido.dataFabricacao,
      caixas: 0,
      pacotes: 0,
      unidades: 0,
      kg: 0,
      pedidoCaixas: pedido.pedido.caixas,
      pedidoPacotes: pedido.pedido.pacotes,
      pedidoUnidades: pedido.pedido.unidades,
      pedidoKg: pedido.pedido.kg,
      metaCaixas: pedido.pedido.caixas,
      metaPacotes: pedido.pedido.pacotes,
      metaUnidades: pedido.pedido.unidades,
      metaKg: pedido.pedido.kg,
    });
    setProducaoModalOpen(true);
  }, []);

  const handlePhotoClick = useCallback((item: PainelLoteItem) => {
    const itemKey = `${item.cliente}-${item.produto}-${item.loteId}`;
    setPhotoDropdownOpen((prev) => (prev === itemKey ? null : itemKey));
  }, []);

  const renderEmbalagemLot = useCallback(
    (pedido: PainelPedidoEmbalagem, embalagemItem: PainelLoteItem) => {
      const itemKey = `${embalagemItem.cliente}-${embalagemItem.produto}-${embalagemItem.loteId}`;
      const isItemLoading = loadingCardId === itemKey;
      const photoStatus = getEmbalagemPhotoStatus(embalagemItem);
      const produzidoDetalhes = buildLoteEmbalagemDisplayEntries(pedido, {
        caixas: embalagemItem.caixas ?? 0,
        pacotes: embalagemItem.pacotes ?? 0,
        unidades: embalagemItem.unidades ?? 0,
        kg: embalagemItem.kg ?? 0,
      });

      const isDeleting = deletingLoteId === embalagemItem.loteId;

      const deleteButton = embalagemItem.loteId ? (
        <button
          type="button"
          className="
            inline-flex items-center justify-center
            min-h-11 min-w-11 rounded-md text-red-400
            hover:bg-gray-700/50 hover:text-red-300
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500
            disabled:opacity-60 disabled:cursor-wait
          "
          aria-label={`Excluir lote de ${embalagemItem.produto}`}
          aria-busy={isDeleting}
          disabled={isDeleting || isItemLoading}
          onClick={(e) => {
            e.stopPropagation();
            void handleDeleteLote(embalagemItem);
          }}
        >
          {isDeleting ? (
            <span
              className="inline-block h-5 w-5 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          ) : (
            <span className="material-icons text-xl" aria-hidden>
              delete_outline
            </span>
          )}
        </button>
      ) : null;

      return (
        <div key={itemKey} className="relative">
          <ProductCompactCard
            produto={embalagemItem.produto}
            produzido={embalagemItem.produzido}
            aProduzir={embalagemItem.aProduzir}
            unidade={embalagemItem.unidade}
            congelado={embalagemItem.congelado === 'Sim'}
            hasPhoto={photoStatus.hasPhoto}
            photoColor={photoStatus.color}
            onPhotoClick={() => handlePhotoClick(embalagemItem)}
            onClick={() => void handleEditProducao(embalagemItem)}
            isLoading={isItemLoading}
            detalhesProduzido={produzidoDetalhes}
            horarioEmbalagem={horarioEmbalagemParaCard(embalagemItem)}
            trailingSlot={deleteButton}
          />

          {photoDropdownOpen === itemKey &&
            (embalagemItem.pacoteFotoUrl ||
              embalagemItem.etiquetaFotoUrl ||
              embalagemItem.palletFotoUrl) && (
              <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[200px]">
                {embalagemItem.pacoteFotoUrl && (
                  <a
                    href={embalagemItem.pacoteFotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setPhotoDropdownOpen(null)}
                  >
                    <span className="text-sm">📦</span>
                    <span className="text-sm">Foto do Pacote</span>
                  </a>
                )}
                {embalagemItem.etiquetaFotoUrl && (
                  <a
                    href={embalagemItem.etiquetaFotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setPhotoDropdownOpen(null)}
                  >
                    <span className="text-sm">🏷️</span>
                    <span className="text-sm">Foto da Etiqueta</span>
                  </a>
                )}
                {embalagemItem.palletFotoUrl && (
                  <a
                    href={embalagemItem.palletFotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setPhotoDropdownOpen(null)}
                  >
                    <span className="text-sm">🚛</span>
                    <span className="text-sm">Foto do Pallet</span>
                  </a>
                )}
              </div>
            )}
        </div>
      );
    },
    [loadingCardId, deletingLoteId, photoDropdownOpen, handlePhotoClick, handleEditProducao, handleDeleteLote],
  );

  const refreshPainelData = async () => {
    await refreshPedidosOnly();
  };

  const handleSaveProducao = async (producaoData: ProducaoData) => {
    if (!editingItem?.loteId) return;

    try {
      setProducaoLoading(true);
      setMessage(null);

      const res = await fetch(`/api/producao/embalagem/lote/${editingItem.loteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producaoData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar produção');

      setEditingItem(null);
      setProducaoLoading(false);
      setMessage('Produção atualizada com sucesso!');
      await refreshPainelData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(getVisibleErrorMessage(err, 'Erro ao salvar produção'));
      setProducaoLoading(false);
    }
  };

  const dashboardItems = useMemo(() => pedidosToDashboardItems(pedidos), [pedidos]);
  const dashboardPrev = comparisonPrevItems;
  const dashboardWeek = comparisonWeekItems;

  const { gruposNaoFinalizados, gruposFinalizados } = useMemo(
    () => splitPedidosEmbalagemEmGrupos(pedidos, selectedDate),
    [pedidos, selectedDate],
  );

  const totais = useMemo(() => {
    const totalCaixasProduzido = pedidos.reduce((sum, p) => sum + p.produzido.caixas, 0);
    const totalPacotesProduzido = pedidos.reduce((sum, p) => sum + p.produzido.pacotes, 0);
    const totalCaixasMeta = pedidos.reduce((sum, p) => sum + p.pedido.caixas, 0);
    const totalPacotesMeta = pedidos.reduce((sum, p) => sum + p.pedido.pacotes, 0);

    return {
      produzido: formatQuantidade(totalCaixasProduzido, totalPacotesProduzido),
      meta: formatQuantidade(totalCaixasMeta, totalPacotesMeta),
    };
  }, [pedidos]);

  const accordionOpts = {
    renderEmbalagemLot,
    onNovoLote: handleNovoLote,
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <RealizadoHeader
        title="Realizado: Embalagem"
        icon="📦"
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      <div className="p-4">
        {message && (
          <div
            className={`mb-4 p-4 rounded-md border ${
              message.includes('sucesso')
                ? 'bg-green-800/30 border-green-600 text-green-100'
                : 'bg-red-800/30 border-red-600 text-red-100'
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <EmbalagemPageSkeleton />
        ) : (
          <>
            {refreshing ? (
              <div
                className="mb-3 flex items-center gap-2 text-sm text-gray-400"
                role="status"
                aria-live="polite"
              >
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-gray-600 border-t-amber-400 animate-spin motion-reduce:animate-none" />
                Atualizando dados…
              </div>
            ) : null}
            <div
              className={`grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start transition-opacity duration-200 motion-reduce:transition-none ${
                refreshing ? 'opacity-70 pointer-events-none' : ''
              }`}
            >
              <div className="min-w-0 space-y-8">
                {gruposNaoFinalizados.length > 0 && (
                  <div className="mb-8">
                    <ThreeColumnLayout
                      columnCount={1}
                      groups={gruposNaoFinalizados}
                      renderGroup={(group) => {
                        const g = group as EmbalagemPainelGroup;
                        return (
                          <ClientGroup
                            cliente={g.cliente}
                            dataFabricacao={g.dataFabricacao}
                            observacao={g.observacao}
                            selectedDate={selectedDate}
                          >
                            {g.pedidos.map((pedido) =>
                              renderPedidoAccordion(pedido, g.key, {
                                ...accordionOpts,
                                showNovoLote: true,
                                productionStatusOverride:
                                  pedido.produzidoScalar === 0
                                    ? 'not-started'
                                    : 'partial',
                              }),
                            )}
                          </ClientGroup>
                        );
                      }}
                    />
                  </div>
                )}

                {gruposFinalizados.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Finalizados</h2>
                    <ThreeColumnLayout
                      columnCount={1}
                      groups={gruposFinalizados}
                      renderGroup={(group) => {
                        const g = group as EmbalagemPainelGroup;
                        return (
                          <ClientGroup
                            cliente={g.cliente}
                            dataFabricacao={g.dataFabricacao}
                            observacao={g.observacao}
                            selectedDate={selectedDate}
                          >
                            {g.pedidos.map((pedido) =>
                              renderPedidoAccordion(pedido, g.key, {
                                ...accordionOpts,
                                showNovoLote: true,
                              }),
                            )}
                          </ClientGroup>
                        );
                      }}
                    />
                  </div>
                )}
              </div>

              <EmbalagemDashboard
                selectedDate={selectedDate}
                items={dashboardItems}
                comparisonPrev={
                  dateComparisonPrev
                    ? { date: dateComparisonPrev, items: dashboardPrev }
                    : null
                }
                comparisonWeek={{
                  date: comparisonWeekDate,
                  items: dashboardWeek,
                }}
              />
            </div>

            <footer className="mt-6 text-center text-gray-400 text-sm">
              {gruposNaoFinalizados.length + gruposFinalizados.length} grupos • {pedidos.length}{' '}
              pedidos • {totais.produzido} / {totais.meta}
            </footer>
          </>
        )}
      </div>

      {photoDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setPhotoDropdownOpen(null)} />
      )}

      <ProducaoModal
        isOpen={producaoModalOpen}
        onClose={() => {
          setProducaoModalOpen(false);
          setIsNewLoteModal(false);
          setEditingItem(null);
        }}
        isNewLote={isNewLoteModal}
        onSave={handleSaveProducao}
        onSaveSuccess={refreshPainelData}
        initialData={
          editingItem
            ? {
                caixas: editingItem.caixas || 0,
                pacotes: editingItem.pacotes || 0,
                unidades: editingItem.unidades || 0,
                kg: editingItem.kg || 0,
                pacoteFotoUrl: editingItem.pacoteFotoUrl,
                pacoteFotoId: editingItem.pacoteFotoId,
                pacoteFotoUploadedAt: editingItem.pacoteFotoUploadedAt,
                etiquetaFotoUrl: editingItem.etiquetaFotoUrl,
                etiquetaFotoId: editingItem.etiquetaFotoId,
                etiquetaFotoUploadedAt: editingItem.etiquetaFotoUploadedAt,
                palletFotoUrl: editingItem.palletFotoUrl,
                palletFotoId: editingItem.palletFotoId,
                palletFotoUploadedAt: editingItem.palletFotoUploadedAt,
                obsEmbalagem: editingItem.obsEmbalagem || '',
              }
            : undefined
        }
        produto={editingItem?.produto || ''}
        cliente={editingItem?.cliente || ''}
        loteId={editingItem?.loteId}
        pedidoEmbalagemId={editingItem?.pedidoEmbalagemId}
        congelado={editingItem?.congelado ?? 'Não'}
        pedidoQuantidades={
          editingItem
            ? {
                caixas: editingItem.pedidoCaixas || 0,
                pacotes: editingItem.pedidoPacotes || 0,
                unidades: editingItem.pedidoUnidades || 0,
                kg: editingItem.pedidoKg || 0,
              }
            : undefined
        }
        pedidoMetaOriginal={
          editingItem
            ? {
                caixas: editingItem.metaCaixas ?? 0,
                pacotes: editingItem.metaPacotes ?? 0,
                unidades: editingItem.metaUnidades ?? 0,
                kg: editingItem.metaKg ?? 0,
              }
            : undefined
        }
        loading={producaoLoading}
        mode="embalagem"
      />
    </div>
  );
}
