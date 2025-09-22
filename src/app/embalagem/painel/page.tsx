'use client';

import { useEffect, useMemo, useState } from 'react';

type PainelItem = {
  cliente: string;
  produto: string;
  unidade: 'cx' | 'pct' | 'un' | 'kg';
  congelado: 'Sim' | 'Não';
  observacao: string;
  aProduzir: number;
  produzido: number;
};

function formatUnidade(u: PainelItem['unidade']): string {
  switch (u) {
    case 'cx': return 'CX';
    case 'pct': return 'PCT';
    case 'un': return 'UN';
    case 'kg': return 'KG';
  }
}

function getStatusColor(aProduzir: number, produzido: number): 'red' | 'yellow' | 'green' {
  if (!produzido || produzido === 0) return 'red';
  if (produzido > 0 && produzido < aProduzir) return 'yellow';
  return 'green';
}

export default function PainelEmbalagemPage() {
  const [items, setItems] = useState<PainelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/painel/embalagem');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
        setItems((data.items || []) as PainelItem[]);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Erro ao carregar o painel');
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60_000); // atualizar a cada minuto
    return () => clearInterval(interval);
  }, []);

  // Layout sem rolagem: limitar a no máximo 10-12 linhas; o resto pode ser agrupado/compactado
  const rows = useMemo(() => items.slice(0, 12), [items]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">Painel de Produção - Embalagem</h1>
          <div className="text-gray-300">Atualiza automaticamente</div>
        </header>

        {message && (
          <div className="mb-4 p-4 rounded-md bg-red-800/30 border border-red-600 text-red-100">
            {message}
          </div>
        )}

        <div className="grid grid-cols-12 gap-3 text-sm">
          <div className="col-span-3 px-3 py-2 bg-gray-800/70 rounded-md font-bold">Cliente</div>
          <div className="col-span-3 px-3 py-2 bg-gray-800/70 rounded-md font-bold">Produto</div>
          <div className="col-span-2 px-3 py-2 bg-gray-800/70 rounded-md font-bold">Obs.</div>
          <div className="col-span-1 px-3 py-2 bg-gray-800/70 rounded-md font-bold text-center">A produzir</div>
          <div className="col-span-1 px-3 py-2 bg-gray-800/70 rounded-md font-bold text-center">Produzido</div>
          <div className="col-span-2 px-3 py-2 bg-gray-800/70 rounded-md font-bold text-center">Status</div>

          {loading ? (
            <div className="col-span-12 text-center py-16 text-gray-400">Carregando...</div>
          ) : (
            rows.map((it, idx) => {
              const status = getStatusColor(it.aProduzir, it.produzido);
              const colorClass = status === 'green' ? 'bg-green-500' : status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <div key={idx} className="contents">
                  <div className="col-span-3 px-3 py-4 bg-gray-800/40 rounded-md">{it.cliente}</div>
                  <div className="col-span-3 px-3 py-4 bg-gray-800/40 rounded-md">
                    <div className="font-semibold">{it.produto}</div>
                    <div className="text-gray-400 text-xs mt-1">{it.congelado === 'Sim' ? 'Congelado' : 'Fresco'} • {formatUnidade(it.unidade)}</div>
                  </div>
                  <div className="col-span-2 px-3 py-4 bg-gray-800/40 rounded-md">
                    <div className="text-gray-300 truncate" title={it.observacao}>{it.observacao || '-'}</div>
                  </div>
                  <div className="col-span-1 px-3 py-4 bg-gray-800/40 rounded-md text-center font-extrabold text-xl flex items-center justify-center gap-2">
                    <span>{it.aProduzir}</span>
                    <span className="text-sm font-bold px-2 py-0.5 rounded bg-gray-700/70">{formatUnidade(it.unidade)}</span>
                  </div>
                  <div className="col-span-1 px-3 py-4 bg-gray-800/40 rounded-md text-center font-extrabold text-xl flex items-center justify-center gap-2">
                    <span>{it.produzido}</span>
                    <span className="text-sm font-bold px-2 py-0.5 rounded bg-gray-700/70">{formatUnidade(it.unidade)}</span>
                  </div>
                  <div className="col-span-2 px-3 py-4 bg-gray-800/40 rounded-md flex items-center justify-center">
                    <span className={`inline-block w-6 h-6 rounded-full ${status === 'red' ? 'bg-red-500' : status === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="mt-6 text-center text-gray-400 text-xs">Mostrando até 12 itens do dia</footer>
      </div>
    </div>
  );
}


