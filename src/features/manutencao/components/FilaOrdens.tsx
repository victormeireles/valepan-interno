'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { LinhaFila } from '@/app/actions/manutencao-ordem-consulta';
import { Tabs } from '@/components/ui/Tabs';
import {
  FilaStatusFiltro,
  type FilaStatusFiltroId,
} from '@/domain/manutencao/fila-status-filtro';
import { FilaVazia } from './FilaVazia';
import { RotulosFila } from './rotulos-fila';

const CARTAO = 'overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm';
const FILTRO_PADRAO: FilaStatusFiltroId = 'abertas';
const filtroStatus = new FilaStatusFiltro();

type FilaOrdensProps = {
  itens: LinhaFila[];
  mensagem?: string;
  podeAbrir: boolean;
};

export function FilaOrdens({ itens, mensagem, podeAbrir }: FilaOrdensProps) {
  const [filtro, setFiltro] = useState<FilaStatusFiltroId>(FILTRO_PADRAO);
  const rotulos = new RotulosFila();
  const contagem = useMemo(() => filtroStatus.contar(itens), [itens]);
  const filtradas = useMemo(() => filtroStatus.aplicar(itens, filtro), [itens, filtro]);
  const vazia = mensagemVazia(filtro, mensagem);

  return (
    <div className="space-y-4">
      <CabecalhoFila podeAbrir={podeAbrir} />
      <Tabs
        ariaLabel="Filtro da fila"
        value={filtro}
        onChange={(id) => setFiltro(id as FilaStatusFiltroId)}
        tabs={[
          { id: 'abertas', label: 'Abertas', count: contagem.abertas },
          { id: 'finalizadas', label: 'Finalizadas', count: contagem.finalizadas },
        ]}
      />
      {filtradas.length === 0 ? (
        <FilaVazia mensagem={vazia} comTitulo={false} />
      ) : (
        <ul className={CARTAO}>
          {filtradas.map((item) => (
            <LinhaFila key={item.numero} item={item} rotulos={rotulos} />
          ))}
        </ul>
      )}
    </div>
  );
}

function mensagemVazia(filtro: FilaStatusFiltroId, mensagem?: string): string {
  if (filtro === 'finalizadas') return 'Nenhuma ordem finalizada.';
  return mensagem ?? 'Nenhuma ordem aberta.';
}

function CabecalhoFila({ podeAbrir }: { podeAbrir: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold tracking-tight text-stone-900">Ordens de Serviço</h1>
      {podeAbrir ? <LinkNovaOrdem /> : null}
    </div>
  );
}

function LinkNovaOrdem() {
  return (
    <Link
      href="/manutencao/nova"
      className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-[9px] bg-amber-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
    >
      <span className="material-icons text-lg" aria-hidden="true">
        add
      </span>
      Nova ordem
    </Link>
  );
}

function LinhaFila({ item, rotulos }: { item: LinhaFila; rotulos: RotulosFila }) {
  return (
    <li className="border-b border-stone-100 last:border-b-0 even:bg-stone-50/60">
      <Link
        href={`/manutencao/ordens/${item.numero}`}
        className="flex min-h-11 flex-col gap-1 px-4 py-3 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
      >
        <p className="text-sm font-medium text-stone-900">
          <span className="font-mono tabular-nums">{rotulos.numero(item.numero)}</span>
          {' · '}
          {item.maquinaNome}
        </p>
        <DetalheLinha item={item} rotulos={rotulos} />
      </Link>
    </li>
  );
}

function DetalheLinha({ item, rotulos }: { item: LinhaFila; rotulos: RotulosFila }) {
  return (
    <p className="text-sm leading-5 text-stone-600">
      <span>{item.setorNome}</span>
      <Separador />
      <span className={`font-medium ${rotulos.classeUrgencia(item.urgencia)}`}>
        {rotulos.urgencia(item.urgencia)}
      </span>
      <Separador />
      <span>{rotulos.problema(item.tipoProblema)}</span>
      <Separador />
      <span>{rotulos.status(item.status)}</span>
      {item.recebidaPorNome ? (
        <>
          <Separador />
          <span>Recebida por {item.recebidaPorNome}</span>
        </>
      ) : null}
    </p>
  );
}

function Separador() {
  return <span aria-hidden="true"> · </span>;
}
