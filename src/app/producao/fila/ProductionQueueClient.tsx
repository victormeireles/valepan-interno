'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { filaUrlForStation } from '@/lib/production/production-station-routes';
import {
  formatIsoDateToDDMMYYYY,
  getTodayISOInBrazilTimezone,
  normalizeToISODate,
  parseDateInputToIsoBR,
} from '@/lib/utils/date-utils';
import NovaOrdemModal from '@/components/Producao/NovaOrdemModal';
import DashboardHeader from '@/components/DashboardHeader';
import FilaEntradaFornoHeader from '@/components/Producao/FilaEntradaFornoHeader';
import FilaEntradaEmbalagemHeader from '@/components/Producao/FilaEntradaEmbalagemHeader';
import SaidaFornoProgressHeader from '@/components/Producao/SaidaFornoProgressHeader';
import MassaLotesModal from '@/components/Producao/MassaLotesModal';
import PlanningQueueTable from '@/components/Producao/PlanningQueueTable';
import FilaModalEntradaForno from '@/components/Producao/queue/FilaModalEntradaForno';
import FilaModalSaidaForno from '@/components/Producao/queue/FilaModalSaidaForno';
import FilaModalEntradaEmbalagem, {
  type CarrinhoEmbalagemFilaRow,
} from '@/components/Producao/queue/FilaModalEntradaEmbalagem';
import FilaModalIniciarFermentacao from '@/components/Producao/queue/FilaModalIniciarFermentacao';
import ProductionQueueFornoGroups from '@/components/Producao/queue/ProductionQueueFornoGroups';
import ProductionQueueGenericCards from '@/components/Producao/queue/ProductionQueueGenericCards';
import ProductionQueueSaidaFornoGroups from '@/components/Producao/queue/ProductionQueueSaidaFornoGroups';
import type { CarrinhoFilaForno, ProductionQueueClientProps, ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import {
  getStationInfo,
  parseLatasInputFilaForno,
} from '@/components/Producao/queue/production-queue-metrics';
import {
  startProductionStep,
  registerSaidaForno,
  getEntradaFornoCarrinhosParaSaida,
  marcarPerdaTotalCarrinhoEntradaForno,
  getSaidaFornoCarrinhosParaEmbalagem,
  registerEntradaEmbalagemCarrinhoELatas,
} from '@/app/actions/producao-etapas-actions';
import { useProductionQueueDerived } from '@/hooks/useProductionQueueDerived';
import { useProductionQueueStation } from '@/hooks/useProductionQueueStation';
import { DEFAULT_BANDEJAS_SAIDA, MAX_BANDEJAS_SAIDA } from '@/components/Producao/BandejasStepper';
import { filaEtapaTituloSecaoProntos } from '@/components/Producao/queue/production-queue-metrics';

const MAX_LATAS_POR_CARRINHO = 20;

export default function ProductionQueueClient({
  initialQueue,
  station = 'planejamento',
  totalLatasEntradaFornoHoje = 0,
  filterDateIso = null,
}: ProductionQueueClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionQueueItem | undefined>(undefined);
  const [isMassaLotesModalOpen, setIsMassaLotesModalOpen] = useState(false);
  const [selectedMassaOrder, setSelectedMassaOrder] = useState<ProductionQueueItem | undefined>(undefined);
  const [fermentacaoModalItem, setFermentacaoModalItem] = useState<ProductionQueueItem | null>(null);
  const [expandedFornoProdutoId, setExpandedFornoProdutoId] = useState<string | null>(null);
  const [modalFornoCarrinhosAberto, setModalFornoCarrinhosAberto] = useState(false);
  const [buscaFornoCarrinho, setBuscaFornoCarrinho] = useState('');
  const [carrinhoFornoSelecionado, setCarrinhoFornoSelecionado] = useState<CarrinhoFilaForno | null>(null);
  const [latasFornoField, setLatasFornoField] = useState('');
  const [fornoActionLoading, setFornoActionLoading] = useState(false);
  const [fornoActionError, setFornoActionError] = useState<string | null>(null);
  const [modalSaidaFornoAberto, setModalSaidaFornoAberto] = useState(false);
  const [saidaBuscaOrdem, setSaidaBuscaOrdem] = useState('');
  const [saidaOrdemId, setSaidaOrdemId] = useState('');
  const [saidaCarrinhoField, setSaidaCarrinhoField] = useState('');
  const [saidaBandejasField, setSaidaBandejasField] = useState(String(DEFAULT_BANDEJAS_SAIDA));
  const [saidaCarrinhosDisponiveis, setSaidaCarrinhosDisponiveis] = useState<string[]>([]);
  const [saidaCarrinhosLoading, setSaidaCarrinhosLoading] = useState(false);
  const [saidaCarrinhosError, setSaidaCarrinhosError] = useState<string | null>(null);
  const [saidaActionLoading, setSaidaActionLoading] = useState(false);
  const [saidaActionError, setSaidaActionError] = useState<string | null>(null);
  const [saidaPosConfirm, setSaidaPosConfirm] = useState<'form' | 'nextChoice'>('form');
  const [saidaLastProdutoId, setSaidaLastProdutoId] = useState<string | null>(null);
  const [saidaLastProdutoNome, setSaidaLastProdutoNome] = useState('');
  const [expandedSaidaFornoProdutoId, setExpandedSaidaFornoProdutoId] = useState<string | null>(null);

  const [modalEmbalagemAberto, setModalEmbalagemAberto] = useState(false);
  const [embalagemBusca, setEmbalagemBusca] = useState('');
  const [embalagemCarrinhos, setEmbalagemCarrinhos] = useState<CarrinhoEmbalagemFilaRow[]>([]);
  const [embalagemLoading, setEmbalagemLoading] = useState(false);
  const [embalagemSelecionado, setEmbalagemSelecionado] = useState<CarrinhoEmbalagemFilaRow | null>(null);
  const [embalagemLatas, setEmbalagemLatas] = useState(String(DEFAULT_BANDEJAS_SAIDA));
  const [embalagemSaving, setEmbalagemSaving] = useState(false);
  const [embalagemActionError, setEmbalagemActionError] = useState<string | null>(null);

  const { effectiveStation } = useProductionQueueStation(station);

  const queueFilteredByDataProducao = useMemo(() => {
    if (!filterDateIso) return initialQueue;
    return initialQueue.filter((item) => {
      const raw = item.data_producao;
      if (raw == null || String(raw).trim() === '') return false;
      return normalizeToISODate(raw) === filterDateIso;
    });
  }, [initialQueue, filterDateIso]);

  const {
    flags,
    ordensComProdutoFaltando,
    filteredQueue,
    queueForCardsActive,
    queueForCardsProntos,
    fornoGroupsActive,
    fornoGroupsProntos,
    fornoFilaGlobal,
    fornoUaHomogenea,
    carrinhosParaModalForno,
    saidaFilaGlobal,
    saidaUaHomogenea,
    saidaFornoGroupsActive,
    saidaFornoGroupsProntos,
    embalagemEntradaFilaGlobal,
    embalagemEntradaUaHomogenea,
  } = useProductionQueueDerived(queueFilteredByDataProducao, effectiveStation);

  const tituloSecaoProntosFila = filaEtapaTituloSecaoProntos(effectiveStation);

  const totalEntradaFornoDiaRotulo = useMemo(() => {
    if (!filterDateIso) return 'hoje';
    return filterDateIso === getTodayISOInBrazilTimezone()
      ? 'hoje'
      : `em ${formatIsoDateToDDMMYYYY(filterDateIso)}`;
  }, [filterDateIso]);

  const setFilaDateQuery = (iso: string | null) => {
    const url = filaUrlForStation(effectiveStation, iso ? { data: iso } : undefined);
    router.replace(url);
  };

  const [filaDataTexto, setFilaDataTexto] = useState(() =>
    filterDateIso ? formatIsoDateToDDMMYYYY(filterDateIso) : '',
  );

  useEffect(() => {
    setFilaDataTexto(filterDateIso ? formatIsoDateToDDMMYYYY(filterDateIso) : '');
  }, [filterDateIso]);

  const mostrarTodosFila = () => {
    setFilaDateQuery(null);
    setFilaDataTexto('');
  };

  /** Aplica filtro só ao clicar em «Filtrar» ou Enter no campo (campo vazio não altera a URL). */
  const aplicarFiltrarData = () => {
    const raw = filaDataTexto.trim();
    if (!raw) return;
    const iso = parseDateInputToIsoBR(raw);
    if (iso) {
      setFilaDateQuery(iso);
      setFilaDataTexto(formatIsoDateToDDMMYYYY(iso));
      return;
    }
    setFilaDataTexto(filterDateIso ? formatIsoDateToDDMMYYYY(filterDateIso) : '');
  };

  const {
    isPlanning,
    isFermentacao,
    isEntradaForno,
    isSaidaForno,
    isEntradaEmbalagem,
    isSaidaEmbalagem,
  } = flags;

  const stationInfo = getStationInfo(effectiveStation);

  const carrinhosFiltradosModalForno = useMemo(() => {
    const q = buscaFornoCarrinho.trim().toLowerCase();
    const norm = (s: string) => s.replace(/\s/g, '').toLowerCase();
    const qn = norm(q);
    if (!q) return carrinhosParaModalForno;
    return carrinhosParaModalForno.filter(
      (c) =>
        norm(c.carrinho).includes(qn) ||
        c.carrinho.toLowerCase().includes(q) ||
        c.lote_codigo.toLowerCase().includes(q) ||
        c.produto_nome.toLowerCase().includes(q),
    );
  }, [carrinhosParaModalForno, buscaFornoCarrinho]);

  const ordensParaSelectSaida = useMemo(() => {
    if (!isSaidaForno) return [];
    let list = filteredQueue.filter((i) => !i.produtoJoinFaltando);
    if (modalSaidaFornoAberto && saidaLastProdutoId) {
      list = list.filter((i) => i.produto_id === saidaLastProdutoId);
    }
    return [...list].sort((a, b) => {
      const n = a.produtos.nome.localeCompare(b.produtos.nome, 'pt-BR');
      if (n !== 0) return n;
      return a.lote_codigo.localeCompare(b.lote_codigo, 'pt-BR');
    });
  }, [isSaidaForno, filteredQueue, modalSaidaFornoAberto, saidaLastProdutoId]);

  const closeModalForno = () => {
    setModalFornoCarrinhosAberto(false);
    setCarrinhoFornoSelecionado(null);
    setLatasFornoField('');
    setFornoActionError(null);
  };

  const closeModalSaidaFull = () => {
    setModalSaidaFornoAberto(false);
    setSaidaPosConfirm('form');
    setSaidaLastProdutoId(null);
    setSaidaLastProdutoNome('');
    setSaidaBuscaOrdem('');
    setSaidaOrdemId('');
    setSaidaCarrinhoField('');
    setSaidaBandejasField(String(DEFAULT_BANDEJAS_SAIDA));
    setSaidaCarrinhosDisponiveis([]);
    setSaidaCarrinhosLoading(false);
    setSaidaCarrinhosError(null);
    setSaidaActionError(null);
  };

  useEffect(() => {
    if (!modalSaidaFornoAberto || saidaPosConfirm !== 'form' || !saidaOrdemId) {
      setSaidaCarrinhosDisponiveis([]);
      setSaidaCarrinhosLoading(false);
      setSaidaCarrinhosError(null);
      return;
    }
    let cancelled = false;
    setSaidaCarrinhosLoading(true);
    setSaidaCarrinhosError(null);
    void getEntradaFornoCarrinhosParaSaida(saidaOrdemId)
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          setSaidaCarrinhosDisponiveis([]);
          setSaidaCarrinhosError(res.error || 'Erro ao carregar carrinhos.');
          setSaidaCarrinhosLoading(false);
          return;
        }
        const lista = res.data.map((row) => row.numero_carrinho);
        setSaidaCarrinhosDisponiveis(lista);
        setSaidaCarrinhosError(null);
        setSaidaCarrinhosLoading(false);
        if (lista.length > 0 && !lista.includes(saidaCarrinhoField.trim())) {
          setSaidaCarrinhoField('');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSaidaCarrinhosDisponiveis([]);
        setSaidaCarrinhosLoading(false);
        setSaidaCarrinhosError('Erro ao carregar carrinhos.');
      });
    return () => {
      cancelled = true;
    };
  }, [modalSaidaFornoAberto, saidaPosConfirm, saidaOrdemId, saidaCarrinhoField]);

  const closeModalEmbalagem = () => {
    setModalEmbalagemAberto(false);
    setEmbalagemBusca('');
    setEmbalagemCarrinhos([]);
    setEmbalagemSelecionado(null);
    setEmbalagemLatas(String(DEFAULT_BANDEJAS_SAIDA));
    setEmbalagemActionError(null);
    setEmbalagemSaving(false);
    setEmbalagemLoading(false);
  };

  const carrinhosFiltradosEmbalagem = useMemo(() => {
    const q = embalagemBusca.trim().toLowerCase();
    const norm = (s: string) => s.replace(/\s/g, '').toLowerCase();
    const qn = norm(q);
    if (!q) return embalagemCarrinhos;
    return embalagemCarrinhos.filter(
      (row) =>
        norm(row.numero_carrinho).includes(qn) ||
        row.numero_carrinho.toLowerCase().includes(q) ||
        row.lote_codigo.toLowerCase().includes(q) ||
        row.produto_nome.toLowerCase().includes(q),
    );
  }, [embalagemCarrinhos, embalagemBusca]);

  useEffect(() => {
    if (!modalEmbalagemAberto) return;
    const ok = filteredQueue.filter((i) => !i.produtoJoinFaltando);
    let cancelled = false;
    setEmbalagemLoading(true);
    setEmbalagemActionError(null);
    void Promise.all(
      ok.map(async (item) => {
        const r = await getSaidaFornoCarrinhosParaEmbalagem(item.id);
        if (!r.success) return [] as CarrinhoEmbalagemFilaRow[];
        return r.data.map((d) => ({
          ...d,
          ordem_producao_id: item.id,
          lote_codigo: item.lote_codigo,
          produto_nome: item.produtos.nome,
        }));
      }),
    )
      .then((chunks) => {
        if (cancelled) return;
        const flat = chunks.flat();
        flat.sort((a, b) => new Date(a.saida_fim).getTime() - new Date(b.saida_fim).getTime());
        setEmbalagemCarrinhos(flat);
        setEmbalagemLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setEmbalagemLoading(false);
          setEmbalagemActionError('Erro ao carregar carrinhos.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [modalEmbalagemAberto, filteredQueue]);

  const handleConfirmEntradaForno = async () => {
    const c = carrinhoFornoSelecionado;
    if (!c) return;
    const latas = parseLatasInputFilaForno(latasFornoField);
    if (!Number.isFinite(latas) || latas <= 0) {
      setFornoActionError('Informe um número de latas maior que zero.');
      return;
    }
    if (latas > MAX_LATAS_POR_CARRINHO) {
      setFornoActionError(`Máximo de ${MAX_LATAS_POR_CARRINHO} latas por carrinho.`);
      return;
    }
    if (c.latas_registradas > 0 && latas > c.latas_registradas + 1e-9) {
      setFornoActionError(
        `No máximo ${c.latas_registradas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} LT (fermentação).`,
      );
      return;
    }
    setFornoActionError(null);
    setFornoActionLoading(true);
    try {
      const r = await startProductionStep({
        ordem_producao_id: c.ordem_producao_id,
        etapa: 'entrada_forno',
        qtd_saida: 0,
        dados_qualidade: {
          fermentacao_log_id: c.log_id,
          assadeiras_lt: latas,
        },
      });
      if (!r.success || !r.data) {
        throw new Error(r.error || 'Não foi possível registrar a entrada.');
      }
      closeModalForno();
      router.refresh();
    } catch (e) {
      setFornoActionError(e instanceof Error ? e.message : 'Erro ao registrar.');
    } finally {
      setFornoActionLoading(false);
    }
  };

  const handleMarcarPerdaTotalEntradaForno = async () => {
    const c = carrinhoFornoSelecionado;
    if (!c) return;
    const ok = window.confirm(
      `Confirmar perda total do carrinho ${c.carrinho}? Ele será removido da fila de entrada do forno.`,
    );
    if (!ok) return;
    setFornoActionError(null);
    setFornoActionLoading(true);
    try {
      const r = await marcarPerdaTotalCarrinhoEntradaForno({ fermentacao_log_id: c.log_id });
      if (!r.success) {
        throw new Error(r.error || 'Não foi possível marcar perda total.');
      }
      closeModalForno();
      router.refresh();
    } catch (e) {
      setFornoActionError(e instanceof Error ? e.message : 'Erro ao marcar perda total.');
    } finally {
      setFornoActionLoading(false);
    }
  };

  const handleConfirmSaidaForno = async () => {
    if (!saidaOrdemId) {
      setSaidaActionError('Selecione produto e ordem (lote).');
      return;
    }
    const carrinho = saidaCarrinhoField.trim();
    const bandejas = Math.round(
      Number((saidaBandejasField.trim() || String(DEFAULT_BANDEJAS_SAIDA)).replace(',', '.')),
    );
    if (!carrinho) {
      setSaidaActionError('Informe o número do carrinho.');
      return;
    }
    if (!Number.isFinite(bandejas) || bandejas < 1 || bandejas > MAX_BANDEJAS_SAIDA) {
      setSaidaActionError(`Informe um número inteiro de bandejas/latas entre 1 e ${MAX_BANDEJAS_SAIDA}.`);
      return;
    }
    setSaidaActionError(null);
    setSaidaActionLoading(true);
    try {
      const r = await registerSaidaForno({
        ordem_producao_id: saidaOrdemId,
        numero_carrinho: carrinho,
        bandejas,
      });
      if (!r.success) {
        throw new Error(r.error || 'Erro ao registrar');
      }
      const ord = filteredQueue.find((o) => o.id === saidaOrdemId);
      setSaidaLastProdutoId(ord?.produto_id ?? null);
      setSaidaLastProdutoNome(ord?.produtos.nome ?? '');
      setSaidaPosConfirm('nextChoice');
      router.refresh();
    } catch (e) {
      setSaidaActionError(e instanceof Error ? e.message : 'Erro ao registrar.');
    } finally {
      setSaidaActionLoading(false);
    }
  };

  const handleConfirmEmbalagem = async () => {
    const row = embalagemSelecionado;
    if (!row) return;
    const latasNum = Math.round(Number(String(embalagemLatas).replace(',', '.')));
    if (!Number.isFinite(latasNum) || latasNum < 1) {
      setEmbalagemActionError('Informe um número inteiro de latas (mínimo 1).');
      return;
    }
    const cap = Math.min(MAX_BANDEJAS_SAIDA, row.latas_disponiveis);
    if (latasNum > cap) {
      setEmbalagemActionError(`No máximo ${cap} lata(s) para este carrinho.`);
      return;
    }
    setEmbalagemSaving(true);
    setEmbalagemActionError(null);
    try {
      const r = await registerEntradaEmbalagemCarrinhoELatas({
        ordem_producao_id: row.ordem_producao_id,
        saida_forno_log_id: row.saida_forno_log_id,
        latas: latasNum,
      });
      if (!r.success) {
        throw new Error(r.error || 'Erro ao registrar');
      }
      closeModalEmbalagem();
      router.refresh();
    } catch (e) {
      setEmbalagemActionError(e instanceof Error ? e.message : 'Erro ao registrar.');
    } finally {
      setEmbalagemSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader title={`Produção - ${stationInfo.nome}`} icon={stationInfo.icon} />

      <div
        className={`mx-auto space-y-4 px-3 py-4 sm:space-y-8 sm:p-6 md:p-10 ${isPlanning ? 'max-w-[min(100rem,calc(100vw-2rem))]' : 'max-w-6xl'}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 pb-2 sm:gap-2">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="DD/MM/AAAA"
            value={filaDataTexto}
            onChange={(e) => setFilaDataTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                aplicarFiltrarData();
              }
            }}
            className="min-w-[7.5rem] max-w-[8.5rem] rounded border border-slate-200/60 bg-slate-50/80 px-1.5 py-1.5 text-center text-xs leading-tight tabular-nums text-slate-700 placeholder:text-slate-400/90 focus:border-slate-300/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-200/60 sm:min-w-[8.25rem] sm:max-w-[9rem] sm:py-2"
            aria-label="Data de produção (DD/MM/AAAA)"
          />
          <button
            type="button"
            onClick={aplicarFiltrarData}
            className="shrink-0 rounded-md border border-slate-300/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] sm:px-3 sm:py-2"
          >
            Filtrar
          </button>
          <button
            type="button"
            onClick={mostrarTodosFila}
            className="shrink-0 rounded-md border border-slate-200 bg-slate-100/90 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 active:scale-[0.99] sm:px-3 sm:py-2"
          >
            Mostrar todos
          </button>
        </div>

        {isPlanning && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            <button
              type="button"
              onClick={() => {
                setEditingOrder(undefined);
                setIsModalOpen(true);
              }}
              className="group relative inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 sm:w-auto sm:rounded-2xl sm:px-6 sm:py-4 sm:text-sm"
            >
              <span className="mr-1.5 text-base leading-none sm:mr-2 sm:text-lg">+</span> Nova Ordem
              <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all pointer-events-none" />
            </button>
          </div>
        )}

        {ordensComProdutoFaltando > 0 && (
          <div
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-rose-900 shadow-sm sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3"
            role="alert"
          >
            <span className="material-icons shrink-0 text-lg text-rose-600 sm:text-xl">error_outline</span>
            <div className="min-w-0 text-xs leading-snug sm:text-sm">
              <p className="font-semibold text-rose-950">
                {ordensComProdutoFaltando === 1
                  ? '1 ordem está sem cadastro de produto válido.'
                  : `${ordensComProdutoFaltando} ordens estão sem cadastro de produto válido.`}
              </p>
              <p className="mt-1 text-rose-800/90">
                O vínculo entre a ordem e o produto no banco está quebrado (produto pode ter sido excluído). Corrija o
                cadastro ou edite a ordem e selecione um produto existente.
              </p>
            </div>
          </div>
        )}

        {isEntradaForno && filteredQueue.length > 0 && fornoFilaGlobal && (
          <FilaEntradaFornoHeader
            meta={fornoFilaGlobal.meta}
            fermentacao={fornoFilaGlobal.fermentacao}
            forno={fornoFilaGlobal.forno}
            totalHoje={totalLatasEntradaFornoHoje}
            totalEntradaDiaRotulo={totalEntradaFornoDiaRotulo}
            unidadesPorAssadeiraHomogenea={fornoUaHomogenea}
            onFireClick={() => {
              setModalFornoCarrinhosAberto(true);
              setBuscaFornoCarrinho('');
              setCarrinhoFornoSelecionado(null);
              setLatasFornoField('');
              setFornoActionError(null);
            }}
          />
        )}

        {isSaidaForno && filteredQueue.length > 0 && saidaFilaGlobal && (
          <SaidaFornoProgressHeader
            variant="fila"
            uiDensity="compact"
            meta={saidaFilaGlobal.meta}
            entradaForno={saidaFilaGlobal.entradaForno}
            saidaForno={saidaFilaGlobal.saidaForno}
            unidadesPorAssadeiraHomogenea={saidaUaHomogenea}
            onNovoCarrinho={() => {
              const okList = filteredQueue.filter((i) => !i.produtoJoinFaltando);
              setModalSaidaFornoAberto(true);
              setSaidaPosConfirm('form');
              setSaidaBuscaOrdem('');
              setSaidaOrdemId(okList.length === 1 ? okList[0].id : '');
              setSaidaCarrinhoField('');
              setSaidaBandejasField(String(DEFAULT_BANDEJAS_SAIDA));
              setSaidaActionError(null);
              setSaidaLastProdutoId(null);
              setSaidaLastProdutoNome('');
            }}
          />
        )}

        {isEntradaEmbalagem && filteredQueue.length > 0 && embalagemEntradaFilaGlobal && (
          <FilaEntradaEmbalagemHeader
            meta={embalagemEntradaFilaGlobal.meta}
            saidaForno={embalagemEntradaFilaGlobal.saidaForno}
            entradaEmbalagem={embalagemEntradaFilaGlobal.entradaEmbalagem}
            unidadesPorAssadeiraHomogenea={embalagemEntradaUaHomogenea}
            onIniciar={() => {
              setModalEmbalagemAberto(true);
              setEmbalagemBusca('');
              setEmbalagemSelecionado(null);
              setEmbalagemLatas(String(DEFAULT_BANDEJAS_SAIDA));
              setEmbalagemActionError(null);
            }}
          />
        )}

        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {filteredQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 sm:rounded-3xl sm:py-20">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 sm:mb-4 sm:h-16 sm:w-16">
                <span className="material-icons text-2xl text-gray-300 sm:text-3xl">inbox</span>
              </div>
              <h3 className="text-sm font-medium text-gray-900 sm:text-lg">Fila vazia</h3>
              <p className="mt-1 max-w-sm px-2 text-center text-xs text-gray-500 sm:text-base">
                {filterDateIso && initialQueue.length > 0 && queueFilteredByDataProducao.length === 0
                  ? `Nenhuma ordem com data de produção em ${formatIsoDateToDDMMYYYY(filterDateIso)}. Tente outra data ou use Mostrar todos.`
                  : isFermentacao
                    ? 'Não há ordens com lotes de massa registrados no momento. Produza massa na etapa anterior para aparecer aqui.'
                    : isEntradaForno
                      ? 'Não há ordens com fermentação registrada no momento.'
                      : isSaidaForno
                        ? 'Não há ordens com entrada no forno registrada. Use a etapa Entrada do Forno antes.'
                        : isEntradaEmbalagem || isSaidaEmbalagem
                          ? 'Não há ordens com saída do forno registrada. Conclua a saída do forno antes da embalagem.'
                          : 'Não há ordens de produção pendentes no momento. Crie uma nova ordem para começar.'}
              </p>
            </div>
          ) : isPlanning ? (
            <PlanningQueueTable
              items={filteredQueue}
              onEdit={(item) => {
                setEditingOrder(item as ProductionQueueItem);
                setIsModalOpen(true);
              }}
            />
          ) : isEntradaForno ? (
            <>
              {fornoGroupsActive.length > 0 && (
                <ProductionQueueFornoGroups
                  fornoGroups={fornoGroupsActive}
                  expandedFornoProdutoId={expandedFornoProdutoId}
                  setExpandedFornoProdutoId={setExpandedFornoProdutoId}
                  router={router}
                  filaSecao="active"
                />
              )}
              {fornoGroupsProntos.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-slate-200/90 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {tituloSecaoProntosFila}
                  </p>
                  <ProductionQueueFornoGroups
                    fornoGroups={fornoGroupsProntos}
                    expandedFornoProdutoId={expandedFornoProdutoId}
                    setExpandedFornoProdutoId={setExpandedFornoProdutoId}
                    router={router}
                    filaSecao="prontos"
                  />
                </div>
              )}
            </>
          ) : isSaidaForno ? (
            <>
              {saidaFornoGroupsActive.length > 0 && (
                <ProductionQueueSaidaFornoGroups
                  saidaFornoGroups={saidaFornoGroupsActive}
                  expandedSaidaFornoProdutoId={expandedSaidaFornoProdutoId}
                  setExpandedSaidaFornoProdutoId={setExpandedSaidaFornoProdutoId}
                  router={router}
                  filaSecao="active"
                />
              )}
              {saidaFornoGroupsProntos.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-slate-200/90 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {tituloSecaoProntosFila}
                  </p>
                  <ProductionQueueSaidaFornoGroups
                    saidaFornoGroups={saidaFornoGroupsProntos}
                    expandedSaidaFornoProdutoId={expandedSaidaFornoProdutoId}
                    setExpandedSaidaFornoProdutoId={setExpandedSaidaFornoProdutoId}
                    router={router}
                    filaSecao="prontos"
                  />
                </div>
              )}
            </>
          ) : (
            <ProductionQueueGenericCards
              queueForCardsActive={queueForCardsActive}
              queueForCardsProntos={queueForCardsProntos}
              tituloSecaoProntos={tituloSecaoProntosFila}
              queueForPlanningOrder={filteredQueue}
              effectiveStation={effectiveStation}
              flags={flags}
              router={router}
              onOpenMassaLotes={(item) => {
                setSelectedMassaOrder(item);
                setIsMassaLotesModalOpen(true);
              }}
              onOpenFermentacaoModal={(item) => setFermentacaoModalItem(item)}
            />
          )}
        </div>
      </div>

      <NovaOrdemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOrder(undefined);
        }}
        order={editingOrder}
        onSaved={() => {
          setIsModalOpen(false);
          setEditingOrder(undefined);
          router.refresh();
        }}
      />

      <FilaModalIniciarFermentacao
        open={fermentacaoModalItem != null}
        item={fermentacaoModalItem}
        onClose={() => setFermentacaoModalItem(null)}
        onSuccess={() => router.refresh()}
      />

      {selectedMassaOrder && (
        <MassaLotesModal
          isOpen={isMassaLotesModalOpen}
          onClose={() => {
            setIsMassaLotesModalOpen(false);
            setSelectedMassaOrder(undefined);
          }}
          ordemProducaoId={selectedMassaOrder.id}
          produtoNome={selectedMassaOrder.produtos.nome}
          loteCodigo={selectedMassaOrder.lote_codigo}
        />
      )}

      <FilaModalEntradaForno
        open={modalFornoCarrinhosAberto}
        onClose={closeModalForno}
        buscaFornoCarrinho={buscaFornoCarrinho}
        onBuscaChange={(v) => {
          setBuscaFornoCarrinho(v);
          setCarrinhoFornoSelecionado(null);
          setLatasFornoField('');
          setFornoActionError(null);
        }}
        carrinhosParaModalForno={carrinhosParaModalForno}
        carrinhosFiltradosModalForno={carrinhosFiltradosModalForno}
        carrinhoFornoSelecionado={carrinhoFornoSelecionado}
        onSelectCarrinho={(c) => {
          setCarrinhoFornoSelecionado(c);
          const capped = c.latas_registradas > 0 ? Math.min(MAX_LATAS_POR_CARRINHO, c.latas_registradas) : 0;
          const def = capped > 0 ? String(capped).replace('.', ',') : '';
          setLatasFornoField(def);
          setFornoActionError(null);
        }}
        latasFornoField={latasFornoField}
        onLatasChange={setLatasFornoField}
        fornoActionLoading={fornoActionLoading}
        fornoActionError={fornoActionError}
        onConfirm={handleConfirmEntradaForno}
        onMarcarPerdaTotal={handleMarcarPerdaTotalEntradaForno}
      />

      <FilaModalSaidaForno
        open={modalSaidaFornoAberto}
        onClose={closeModalSaidaFull}
        saidaPosConfirm={saidaPosConfirm}
        saidaLastProdutoNome={saidaLastProdutoNome}
        ordensParaSelectSaida={ordensParaSelectSaida}
        saidaBuscaOrdem={saidaBuscaOrdem}
        onSaidaBuscaOrdemChange={setSaidaBuscaOrdem}
        saidaOrdemId={saidaOrdemId}
        onSaidaOrdemIdChange={(id) => {
          setSaidaOrdemId(id);
          setSaidaCarrinhoField('');
          setSaidaCarrinhosError(null);
          setSaidaActionError(null);
        }}
        saidaCarrinhoField={saidaCarrinhoField}
        onSaidaCarrinhoChange={setSaidaCarrinhoField}
        saidaCarrinhosDisponiveis={saidaCarrinhosDisponiveis}
        saidaCarrinhosLoading={saidaCarrinhosLoading}
        saidaCarrinhosError={saidaCarrinhosError}
        saidaBandejasField={saidaBandejasField}
        onSaidaBandejasChange={setSaidaBandejasField}
        saidaActionLoading={saidaActionLoading}
        saidaActionError={saidaActionError}
        onConfirmRegister={handleConfirmSaidaForno}
        onNextChoiceSim={() => {
          setSaidaPosConfirm('form');
          setSaidaCarrinhoField('');
          setSaidaBandejasField(String(DEFAULT_BANDEJAS_SAIDA));
          setSaidaActionError(null);
          const first = ordensParaSelectSaida[0];
          setSaidaOrdemId(first?.id ?? '');
        }}
        onNextChoiceNao={() => {
          closeModalSaidaFull();
          router.refresh();
        }}
      />

      <FilaModalEntradaEmbalagem
        open={modalEmbalagemAberto}
        onClose={() => !embalagemSaving && closeModalEmbalagem()}
        loadingLista={embalagemLoading}
        busca={embalagemBusca}
        onBuscaChange={(v) => {
          setEmbalagemBusca(v);
          setEmbalagemSelecionado(null);
          setEmbalagemLatas(String(DEFAULT_BANDEJAS_SAIDA));
          setEmbalagemActionError(null);
        }}
        carrinhos={embalagemCarrinhos}
        carrinhosFiltrados={carrinhosFiltradosEmbalagem}
        selecionado={embalagemSelecionado}
        onSelect={(row) => {
          setEmbalagemSelecionado(row);
          const cap = Math.min(MAX_BANDEJAS_SAIDA, row.latas_disponiveis);
          const sug = Math.min(DEFAULT_BANDEJAS_SAIDA, cap);
          setEmbalagemLatas(String(Math.max(1, sug)));
          setEmbalagemActionError(null);
        }}
        latasField={embalagemLatas}
        onLatasChange={setEmbalagemLatas}
        saving={embalagemSaving}
        actionError={embalagemActionError}
        onConfirm={handleConfirmEmbalagem}
      />
    </div>
  );
}
