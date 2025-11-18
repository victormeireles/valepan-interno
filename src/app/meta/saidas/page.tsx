"use client";

import { useEffect, useMemo, useState } from "react";
import CreatePedidoModal from "@/components/CreatePedidoModal";
import EditModal from "@/components/EditModal";
import { QuantityBreakdown } from "@/domain/valueObjects/QuantityBreakdown";
import {
  SaidaSheetRecord,
  SaidaSubmitPayload,
  SaidaQuantidade,
} from "@/domain/types/saidas";

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

const PRIMARY_ORDER: Array<keyof SaidaQuantidade> = [
  "caixas",
  "pacotes",
  "unidades",
  "kg",
];

const UNIT_LABEL: Record<keyof SaidaQuantidade, string> = {
  caixas: "cx",
  pacotes: "pct",
  unidades: "un",
  kg: "kg",
};

type PainelItem = SaidaSheetRecord;

type CreateModalData = {
  dataPedido: string;
  dataFabricacao: string;
  cliente: string;
  observacao: string;
  itens: {
    produto: string;
    congelado: boolean;
    caixas: number;
    pacotes: number;
    unidades: number;
    kg: number;
  }[];
};

type EditModalData = {
  dataPedido: string;
  dataFabricacao: string;
  cliente: string;
  observacao: string;
  produto: string;
  congelado: boolean;
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
};

type EditContext = {
  rowId: number;
  data: EditModalData;
};

function getTodayISO(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateManual(dateString: string): string {
  const parts = dateString.split("-");
  if (parts.length === 3) {
    const [, month, day] = parts;
    return `${day}/${month}`;
  }
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function formatDateFull(dateString: string): string {
  const parts = dateString.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

function sumQuantidade(q: SaidaQuantidade): number {
  return (
    (q.caixas || 0) +
    (q.pacotes || 0) +
    (q.unidades || 0) +
    (q.kg || 0)
  );
}

function getPrimaryQuantity(
  meta: SaidaQuantidade,
  realizado: SaidaQuantidade,
): { unit: string; metaValue: number; realizadoValue: number } {
  for (const key of PRIMARY_ORDER) {
    const metaValue = meta[key] || 0;
    const realizadoValue = realizado[key] || 0;
    if (metaValue > 0 || realizadoValue > 0) {
      return {
        unit: UNIT_LABEL[key],
        metaValue,
        realizadoValue,
      };
    }
  }

  const metaTotal = sumQuantidade(meta);
  const realizadoTotal = sumQuantidade(realizado);

  return {
    unit: "un",
    metaValue: metaTotal,
    realizadoValue: realizadoTotal,
  };
}

function formatEntries(entries: ReturnType<typeof QuantityBreakdown.buildEntries>): string {
  return entries
    .filter((entry) => (entry.quantidade || 0) > 0)
    .map((entry) => `${numberFormatter.format(entry.quantidade || 0)} ${entry.unidade}`)
    .join(" • ") || "0";
}

export default function MetaSaidasPage() {
  const [items, setItems] = useState<PainelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [clientesOptions, setClientesOptions] = useState<string[]>([]);
  const [produtosOptions, setProdutosOptions] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContext, setEditContext] = useState<EditContext | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [loadingRowId, setLoadingRowId] = useState<number | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [clientesRes, produtosRes] = await Promise.all([
          fetch("/api/options/saidas?type=clientes"),
          fetch("/api/options/saidas?type=produtos"),
        ]);
        const clientesData = await clientesRes.json();
        const produtosData = await produtosRes.json();
        if (clientesRes.ok) setClientesOptions(clientesData.options || []);
        if (produtosRes.ok) setProdutosOptions(produtosData.options || []);
      } catch (error) {
        console.error("Erro ao carregar opções de saídas:", error);
      }
    };

    loadOptions();
  }, []);

  const loadPainel = async (date: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/painel/saidas?date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar metas de saídas");
      setItems((data.items || []) as PainelItem[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar painel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPainel(selectedDate);
  }, [selectedDate]);

  const handleCreateMeta = async (data: CreateModalData) => {
    const payload: SaidaSubmitPayload = {
      data: data.dataPedido,
      cliente: data.cliente,
      observacao: data.observacao,
      itens: data.itens.map((item) => ({
        produto: item.produto,
        meta: {
          caixas: item.caixas || 0,
          pacotes: item.pacotes || 0,
          unidades: item.unidades || 0,
          kg: item.kg || 0,
        },
      })),
    };

    try {
      setCreateLoading(true);
      setMessage(null);
      const res = await fetch("/api/submit/saidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Falha ao criar meta de saída");
      await loadPainel(selectedDate);
      setMessage("Meta de saída criada com sucesso!");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setCreateLoading(false);
    }
  };

  const openEditModal = async (item: PainelItem) => {
    if (!item.rowIndex) {
      setMessage("Item inválido para edição");
      return;
    }

    try {
      setLoadingRowId(item.rowIndex);
      const res = await fetch(`/api/saidas/edit/${item.rowIndex}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar meta");

      setEditContext({
        rowId: item.rowIndex,
        data: {
          dataPedido: data.data.data,
          dataFabricacao: data.data.data,
          cliente: data.data.cliente,
          observacao: data.data.observacao || "",
          produto: data.data.produto,
          congelado: false,
          caixas: data.data.meta.caixas || 0,
          pacotes: data.data.meta.pacotes || 0,
          unidades: data.data.meta.unidades || 0,
          kg: data.data.meta.kg || 0,
        },
      });
      setEditModalOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar dados para edição");
    } finally {
      setLoadingRowId(null);
    }
  };

  const handleSaveEdit = async (data: EditModalData) => {
    if (!editContext) return;

    try {
      setEditLoading(true);
      setMessage(null);
      const payload = {
        data: data.dataPedido,
        cliente: data.cliente,
        observacao: data.observacao,
        produto: data.produto,
        meta: {
          caixas: data.caixas || 0,
          pacotes: data.pacotes || 0,
          unidades: data.unidades || 0,
          kg: data.kg || 0,
        },
      };

      const res = await fetch(`/api/saidas/edit/${editContext.rowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Falha ao salvar meta");

      await loadPainel(selectedDate);
      setMessage("Meta atualizada com sucesso!");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editContext) return;

    try {
      setEditLoading(true);
      const res = await fetch(`/api/saidas/delete/${editContext.rowId}`, {
        method: "DELETE",
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Falha ao remover meta");
      await loadPainel(selectedDate);
      setMessage("Meta removida com sucesso!");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setEditLoading(false);
    }
  };

  // Agrupar itens por cliente/data/obs para exibição visual
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: PainelItem[] } = {};
    
    items.forEach(item => {
      // Criar chave única baseada em cliente + data + observacao
      const data = item.data || selectedDate;
      const obs = item.observacao?.trim() || '';
      const groupKey = `${item.cliente}|${data}|${obs}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });
    
    // Ordenar itens dentro de cada grupo por rowIndex
    const sortedGroups: { [key: string]: PainelItem[] } = {};
    Object.entries(groups).forEach(([groupKey, groupItems]) => {
      sortedGroups[groupKey] = [...groupItems].sort((a, b) => {
        const rowIdA = a.rowIndex ?? Number.MAX_SAFE_INTEGER;
        const rowIdB = b.rowIndex ?? Number.MAX_SAFE_INTEGER;
        return rowIdA - rowIdB;
      });
    });
    
    return sortedGroups;
  }, [items, selectedDate]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto">
        <header className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span className="text-3xl">📤</span>
              Meta de Saídas
            </h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                + Nova Meta
              </button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label
                  htmlFor="date-filter"
                  className="text-gray-300 text-sm font-medium whitespace-nowrap"
                >
                  Data:
                </label>
                <input
                  id="date-filter"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="flex-1 sm:flex-none px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
              <div className="text-gray-300 text-sm hidden sm:block">
                Atualiza automaticamente
              </div>
            </div>
          </div>
        </header>

        {message && (
          <div
            className={`mb-4 p-4 rounded-md border ${
              message.toLowerCase().includes("sucesso")
                ? "bg-green-800/30 border-green-600 text-green-100"
                : "bg-red-800/30 border-red-600 text-red-100"
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-xl">Carregando...</div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {Object.entries(groupedItems).map(([groupKey, groupItems]) => {
              // Extrair informações do grupo da chave
              const [cliente, data, obs] = groupKey.split('|');
              const dataDiferente = data !== selectedDate;
              const observacao = obs || '';
              
              return (
                <div
                  key={groupKey}
                  className="bg-slate-800/20 border border-slate-600/30 rounded-lg p-4 space-y-3 w-full lg:inline-block lg:w-auto"
                >
                  {/* Header do Cliente com Data e Observação */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">{cliente}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {dataDiferente && (
                        <div className="text-yellow-300">
                          <span className="font-medium">Data:</span> {formatDateManual(data)}
                        </div>
                      )}
                      {observacao && (
                        <div className="text-gray-300">
                          Obs: {observacao}
                        </div>
                      )}
                      <div className="text-gray-300">
                        {groupItems.length} produto{groupItems.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Cards de Produtos Individuais */}
                  <div className="flex flex-wrap gap-2">
                    {groupItems.map((item) => {
                    const metaEntries = QuantityBreakdown.buildEntries([
                      { quantidade: item.meta.caixas, unidade: "cx" },
                      { quantidade: item.meta.pacotes, unidade: "pct" },
                      { quantidade: item.meta.unidades, unidade: "un" },
                      { quantidade: item.meta.kg, unidade: "kg" },
                    ]);

                    const realizadoEntries = QuantityBreakdown.buildEntries([
                      { quantidade: item.realizado.caixas, unidade: "cx" },
                      { quantidade: item.realizado.pacotes, unidade: "pct" },
                      { quantidade: item.realizado.unidades, unidade: "un" },
                      { quantidade: item.realizado.kg, unidade: "kg" },
                    ]);

                    const primary = getPrimaryQuantity(item.meta, item.realizado);
                    const metaForProgress = primary.metaValue || sumQuantidade(item.meta);
                    const realizadoForProgress =
                      primary.realizadoValue || sumQuantidade(item.realizado);
                    const progress =
                      metaForProgress > 0
                        ? Math.min((realizadoForProgress / metaForProgress) * 100, 100)
                        : 0;

                    const cardClasses =
                      realizadoForProgress === 0
                        ? "bg-red-900/20 border border-red-500/30"
                        : "bg-slate-800/40";

                    const itemKey = item.rowIndex ? `${item.produto}-${item.rowIndex}` : item.produto;
                    const isItemLoading = loadingRowId === item.rowIndex;

                    return (
                      <div
                        key={itemKey}
                        className={`p-2.5 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 relative w-full sm:w-64 lg:min-w-[350px] flex-shrink-0 ${cardClasses} ${
                          isItemLoading ? "opacity-75 pointer-events-none" : ""
                        }`}
                        onClick={() => openEditModal(item)}
                      >
                        {isItemLoading && (
                          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center rounded-lg">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                              <span className="text-white text-xs font-medium">Carregando...</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start justify-between mb-2">
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <span className="font-semibold text-white text-sm truncate">
                              {item.produto}
                            </span>
                            <span className="text-xs text-gray-300 truncate">
                              {item.cliente}
                            </span>
                            {item.observacao && (
                              <span className="text-xs text-gray-500 truncate">
                                {item.observacao}
                              </span>
                            )}
                          </div>
                          <div className="text-right ml-2 flex-shrink-0">
                            <div className="text-base font-bold text-white">
                              {numberFormatter.format(primary.realizadoValue)} / {" "}
                              {numberFormatter.format(primary.metaValue)} {primary.unit.toUpperCase()}
                            </div>
                          </div>
                        </div>

                        <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              realizadoForProgress === 0
                                ? "bg-red-500 animate-pulse shadow-lg shadow-red-500/50"
                                : progress < 100
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                          <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-2">
                            <span className="block text-[11px] uppercase text-gray-400 mb-1">
                              Meta
                            </span>
                            <span className="font-semibold">
                              {formatEntries(metaEntries)}
                            </span>
                          </div>
                          <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-2">
                            <span className="block text-[11px] uppercase text-gray-400 mb-1">
                              Realizado
                            </span>
                            <span className="font-semibold">
                              {formatEntries(realizadoEntries)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <footer className="mt-6 text-center text-gray-400 text-sm">
          {Object.keys(groupedItems).length} grupo{Object.keys(groupedItems).length !== 1 ? "s" : ""} • {items.length} item{items.length !== 1 ? "s" : ""} • {formatDateFull(selectedDate)}
        </footer>
      </div>

      <CreatePedidoModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreateMeta}
        clientesOptions={clientesOptions}
        produtosOptions={produtosOptions}
        loading={createLoading}
        visibleFields={{
          dataFabricacao: false,
          congelado: false,
        }}
        labelsOverride={{
          title: "Nova Meta de Saída",
        }}
      />

      <EditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditContext(null);
        }}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
        rowId={editContext?.rowId}
        initialData={editContext?.data}
        clientesOptions={clientesOptions}
        produtosOptions={produtosOptions}
        loading={editLoading}
        visibleFields={{
          dataFabricacao: false,
          congelado: false,
        }}
        labelsOverride={{
          title: 'Editar Meta de Saída',
        }}
      />
    </div>
  );
}


