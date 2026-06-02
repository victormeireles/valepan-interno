'use client';

import { useMemo, useState } from 'react';
import type { AssadeiraRow } from '@/app/actions/assadeiras-actions';
import type { ClienteLatasRow, ProdutoLatasRow } from '@/app/actions/latas-cadastro-actions';
import EditarLataPanel from './EditarLataPanel';

export type ProdutoPorLata = {
  produtoId: string;
  nome: string;
  codigo: string;
  unidadesPorLata: number;
};

export default function PorLataTableRow({
  assadeira,
  plist,
  produtos,
  clientes,
  bloqueadosClienteIds,
  assadeirasSorted,
  onRefreshProdutos,
  onRefreshAssadeiras,
  onRefreshBloqueios,
  setMsg,
}: {
  assadeira: AssadeiraRow;
  plist: ProdutoPorLata[];
  produtos: ProdutoLatasRow[];
  clientes: ClienteLatasRow[];
  bloqueadosClienteIds: string[];
  assadeirasSorted: AssadeiraRow[];
  onRefreshProdutos: () => Promise<void>;
  onRefreshAssadeiras: () => Promise<void>;
  onRefreshBloqueios: () => Promise<void>;
  setMsg: (m: { type: 'ok' | 'err'; text: string } | null) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [showProdutosSuportados, setShowProdutosSuportados] = useState(false);
  const [showClientesExcluidos, setShowClientesExcluidos] = useState(false);

  const clientesBloqueadosResumo = useMemo(() => {
    return bloqueadosClienteIds
      .map((id) => {
        const c = clientes.find((x) => x.id === id);
        const n = c?.nome_fantasia?.trim();
        return n ? { id, nome: n } : null;
      })
      .filter((x): x is { id: string; nome: string } => x != null);
  }, [bloqueadosClienteIds, clientes]);

  const buracos = Math.round(Number(assadeira.numero_buracos ?? 0));

  return (
    <>
      <tr className="border-b border-gray-50 align-middle hover:bg-gray-50/60">
        <td className="px-3 py-2">
          <LataNomeCell assadeira={assadeira} />
        </td>
        <td className="px-3 py-2 text-right align-middle tabular-nums text-sm font-semibold text-gray-800">
          {buracos}
        </td>
        <td className="px-3 py-2 text-right align-middle tabular-nums text-sm font-semibold text-gray-800">
          {assadeira.quantidade_latas ?? 0}
        </td>
        <td className="px-3 py-2 align-middle">
          <ProdutosResumoCell
            plist={plist}
            expanded={showProdutosSuportados}
            onToggle={() => setShowProdutosSuportados((v) => !v)}
          />
        </td>
        <td className="px-3 py-2 align-middle min-w-[8rem] max-w-[14rem]">
          <ClientesExclusaoCell
            resumo={clientesBloqueadosResumo}
            expanded={showClientesExcluidos}
            onToggle={() => setShowClientesExcluidos((v) => !v)}
          />
        </td>
        <td className="px-3 py-2 text-right align-middle">
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
          >
            <span className="material-icons text-base text-slate-500">edit</span>
            Editar
          </button>
        </td>
      </tr>

      <EditarLataPanel
        open={panelOpen}
        assadeira={assadeira}
        produtos={produtos}
        clientes={clientes}
        bloqueadosClienteIds={bloqueadosClienteIds}
        assadeirasSorted={assadeirasSorted}
        onClose={() => setPanelOpen(false)}
        onRefreshProdutos={onRefreshProdutos}
        onRefreshAssadeiras={onRefreshAssadeiras}
        onRefreshBloqueios={onRefreshBloqueios}
        onMessage={setMsg}
      />
    </>
  );
}

function LataNomeCell({ assadeira }: { assadeira: AssadeiraRow }) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-semibold text-gray-900 leading-tight">{assadeira.nome}</div>
      {!assadeira.ativo && (
        <span className="mt-0.5 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700">
          Inativa
        </span>
      )}
    </div>
  );
}

function ProdutosResumoCell({
  plist,
  expanded,
  onToggle,
}: {
  plist: ProdutoPorLata[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (plist.length === 0) {
    return (
      <span className="text-xs text-amber-800 bg-amber-50/90 border border-amber-100 rounded-lg px-2 py-1 inline-block">
        Nenhum produto
      </span>
    );
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-slate-50"
      >
        <span className="font-medium">{plist[0]?.nome}</span>
        {plist.length > 1 && <span className="text-gray-500">+{plist.length - 1}</span>}
        <span className="material-icons text-sm text-slate-500">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {expanded && (
        <ul className="max-h-28 space-y-0.5 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
          {plist.map((p) => (
            <li key={p.produtoId} className="truncate">
              {p.nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientesExclusaoCell({
  resumo,
  expanded,
  onToggle,
}: {
  resumo: { id: string; nome: string }[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (resumo.length === 0) {
    return <span className="text-xs text-gray-400">Nenhuma</span>;
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-50"
      >
        <span>{resumo[0]?.nome}</span>
        {resumo.length > 1 && <span className="text-gray-500">+{resumo.length - 1}</span>}
        <span className="material-icons text-sm text-rose-700">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {expanded && (
        <ul className="max-h-28 space-y-0.5 overflow-y-auto rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-900">
          {resumo.map((x) => (
            <li key={x.id} className="truncate">
              {x.nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
