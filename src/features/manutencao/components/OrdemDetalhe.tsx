'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { devolverOrdem, receberOrdem } from '@/app/actions/manutencao-ordem-actions';
import type { OrdemCarregada, PecaOrdemVista } from '@/app/actions/manutencao-ordem-consulta';
import { Button } from '@/components/ui/Button';
import { OrdemCancelarFormulario } from './OrdemCancelarFormulario';
import { OrdemFinalizarFormulario } from './OrdemFinalizarFormulario';
import { apresentacaoOrdem, linhaTempoOrdem } from './ordem-detalhe-apresentacao';
import type { AjudanteEscolha, PecaEscolha } from './ordem-finalizar-estado';
import { RotulosFila } from './rotulos-fila';

const CARTAO = 'rounded-xl border border-stone-200 bg-white shadow-sm';
const ROTULO_TIPO = { corretiva: 'Corretiva', preventiva: 'Preventiva' } as const;
const ROTULO_STATUS: Record<OrdemCarregada['status'], string> = {
  aberta: 'Aberta',
  recebida: 'Recebida',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

type Painel = 'nenhum' | 'finalizar' | 'cancelar';
type Aviso = { texto: string; ok: boolean };
type ApoioFinalizacao = {
  pecas: PecaEscolha[];
  ajudantes: AjudanteEscolha[];
  inicioPadrao: string;
  fimPadrao: string;
  inicioIsoPadrao: string;
  fimIsoPadrao: string;
};
type OrdemDetalheProps = { ordem: OrdemCarregada; apoio: ApoioFinalizacao };
type ResultadoAcao = { ok: boolean; mensagem: string };

const rotulos = new RotulosFila();

export function OrdemDetalhe({ ordem, apoio }: OrdemDetalheProps) {
  const acoes = useAcoesOrdem();

  return (
    <div className="space-y-4">
      <Cabecalho ordem={ordem} />
      <Resumo ordem={ordem} />
      <LinhaDoTempo ordem={ordem} />
      <PecasOrdem ordem={ordem} />
      <AjudantesFeitos ajudantes={ordem.ajudantes} />
      {acoes.aviso ? <AvisoAcao aviso={acoes.aviso} /> : null}
      <BarraAcoes ordem={ordem} enviando={acoes.enviando} onAcao={acoes.disparar} onPainel={acoes.abrir} />
      {ordem.podeFinalizar && acoes.painel === 'finalizar' ? (
        <OrdemFinalizarFormulario
          numero={ordem.numero}
          pecas={apoio.pecas}
          ajudantes={apoio.ajudantes}
          inicioPadrao={apoio.inicioPadrao}
          fimPadrao={apoio.fimPadrao}
          inicioIsoPadrao={apoio.inicioIsoPadrao}
          fimIsoPadrao={apoio.fimIsoPadrao}
          onConcluir={acoes.concluir}
        />
      ) : null}
      {acoes.painel === 'cancelar' ? (
        <OrdemCancelarFormulario
          numero={ordem.numero}
          exigeMotivo={ordem.exigeMotivo}
          onConcluir={acoes.concluir}
        />
      ) : null}
    </div>
  );
}

function useAcoesOrdem() {
  const router = useRouter();
  const [painel, setPainel] = useState<Painel>('nenhum');
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function disparar(acao: () => Promise<ResultadoAcao>) {
    if (enviando) return;
    setEnviando(true);
    setAviso(null);
    try {
      const resultado = await acao();
      publicar(resultado, setAviso, setPainel, () => router.refresh());
    } finally {
      setEnviando(false);
    }
  }

  function concluir(mensagem: string) {
    setAviso({ texto: mensagem, ok: true });
    setPainel('nenhum');
    router.refresh();
  }

  return {
    painel,
    aviso,
    enviando,
    abrir: (proximo: Painel) => {
      setAviso(null);
      setPainel(proximo);
    },
    disparar,
    concluir,
  };
}

function publicar(
  resultado: ResultadoAcao,
  definirAviso: (aviso: Aviso) => void,
  definirPainel: (painel: Painel) => void,
  atualizar: () => void,
) {
  definirAviso({ texto: resultado.mensagem, ok: resultado.ok });
  if (!resultado.ok) return;
  definirPainel('nenhum');
  atualizar();
}

function Cabecalho({ ordem }: { ordem: OrdemCarregada }) {
  return (
    <div className="space-y-1">
      <Link
        href="/manutencao"
        className="inline-flex h-11 items-center gap-1 text-sm font-medium text-amber-800"
      >
        <span className="material-icons text-lg" aria-hidden="true">
          arrow_back
        </span>
        Fila
      </Link>
      <h1 className="font-mono text-xl font-bold tabular-nums tracking-tight text-stone-900">
        {apresentacaoOrdem.numero(ordem.numero)}
      </h1>
    </div>
  );
}

function Resumo({ ordem }: { ordem: OrdemCarregada }) {
  return (
    <section className={`${CARTAO} space-y-3 p-4`}>
      <p className="text-sm leading-5 text-stone-600">
        <span className="font-medium text-stone-900">{ordem.maquinaNome}</span>
        <Separador />
        <span>{ordem.setorNome}</span>
        <Separador />
        <span>{ROTULO_TIPO[ordem.tipo]}</span>
        {ordem.urgencia ? (
          <>
            <Separador />
            <span className={`font-medium ${rotulos.classeUrgencia(ordem.urgencia)}`}>
              {rotulos.urgencia(ordem.urgencia)}
            </span>
          </>
        ) : null}
        {ordem.tipoProblema ? (
          <>
            <Separador />
            <span>{rotulos.problema(ordem.tipoProblema)}</span>
          </>
        ) : null}
        <Separador />
        <span>{ROTULO_STATUS[ordem.status]}</span>
      </p>
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Descrição</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">{ordem.descricao}</p>
      </div>
    </section>
  );
}

function LinhaDoTempo({ ordem }: { ordem: OrdemCarregada }) {
  return (
    <section className={`${CARTAO} space-y-3 p-4`}>
      <h2 className="text-sm font-semibold text-stone-900">Linha do tempo</h2>
      <ol className="space-y-3">
        {linhaTempoOrdem.eventos(ordem).map((evento) => (
          <li key={evento.id} className="border-l-2 border-amber-600 pl-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              {evento.rotulo}
            </p>
            <p className="font-mono text-sm tabular-nums text-stone-900">{evento.quando}</p>
            {evento.detalhe ? (
              <p className="whitespace-pre-wrap text-sm text-stone-700">{evento.detalhe}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function PecasOrdem({ ordem }: { ordem: OrdemCarregada }) {
  const veCusto = ordem.custoPecasCentavos !== null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-stone-900">Peças</h2>
      {ordem.pecas.length === 0 ? (
        <p className={`${CARTAO} px-4 py-6 text-sm text-stone-600`}>Nenhuma peça.</p>
      ) : (
        <ul className={`${CARTAO} overflow-hidden`}>
          {ordem.pecas.map((peca, indice) => (
            <LinhaPecaOrdem key={`${peca.nome}-${indice}`} peca={peca} veCusto={veCusto} />
          ))}
        </ul>
      )}
      {veCusto && (ordem.pecas.length > 0 || ordem.status === 'finalizada') ? (
        <TotalPecas centavos={ordem.custoPecasCentavos ?? 0} />
      ) : null}
    </section>
  );
}

function LinhaPecaOrdem({ peca, veCusto }: { peca: PecaOrdemVista; veCusto: boolean }) {
  return (
    <li className="flex min-h-11 items-baseline justify-between gap-3 border-b border-stone-100 px-4 py-3 last:border-b-0 even:bg-stone-50/60">
      <span className="min-w-0 truncate text-sm font-medium text-stone-900">{peca.nome}</span>
      <span className="font-mono text-sm tabular-nums text-stone-800">
        {apresentacaoOrdem.quantidade(peca.quantidade)}
      </span>
      {veCusto && peca.custoTotalCentavos !== null ? (
        <span
          className={`font-mono text-sm tabular-nums ${peca.custoTotalCentavos < 0 ? 'text-red-700' : 'text-stone-900'}`}
        >
          {apresentacaoOrdem.reais(peca.custoTotalCentavos)}
        </span>
      ) : null}
    </li>
  );
}

function TotalPecas({ centavos }: { centavos: number }) {
  return (
    <p className={`text-right text-sm ${centavos < 0 ? 'text-red-700' : 'text-stone-700'}`}>
      Total{' '}
      <span className="font-mono font-semibold tabular-nums">{apresentacaoOrdem.reais(centavos)}</span>
    </p>
  );
}

function AjudantesFeitos({ ajudantes }: { ajudantes: { nome: string }[] }) {
  if (ajudantes.length === 0) return null;
  return (
    <section className={`${CARTAO} space-y-1 p-4`}>
      <h2 className="text-sm font-semibold text-stone-900">Ajudantes</h2>
      <p className="text-sm text-stone-700">{ajudantes.map((item) => item.nome).join(', ')}</p>
    </section>
  );
}

function AvisoAcao({ aviso }: { aviso: Aviso }) {
  const cor = aviso.ok ? 'text-emerald-800' : 'text-red-700';
  return (
    <p className={`text-sm ${cor}`} role={aviso.ok ? 'status' : 'alert'}>
      {aviso.texto}
    </p>
  );
}

function BarraAcoes({
  ordem,
  enviando,
  onAcao,
  onPainel,
}: {
  ordem: OrdemCarregada;
  enviando: boolean;
  onAcao: (acao: () => Promise<ResultadoAcao>) => void;
  onPainel: (painel: Painel) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ordem.podeReceber ? (
        <Button size="lg" icon="how_to_reg" disabled={enviando} onClick={() => onAcao(() => receberOrdem(ordem.numero))}>
          Recebi
        </Button>
      ) : null}
      {ordem.podeDevolver ? (
        <Button size="lg" variant="secondary" icon="undo" disabled={enviando} onClick={() => onAcao(() => devolverOrdem(ordem.numero))}>
          Devolver
        </Button>
      ) : null}
      {ordem.podeFinalizar ? (
        <Button size="lg" icon="check_circle" disabled={enviando} onClick={() => onPainel('finalizar')}>
          Finalizar
        </Button>
      ) : null}
      {ordem.podeCancelar ? (
        <Button size="lg" variant="danger" icon="cancel" disabled={enviando} onClick={() => onPainel('cancelar')}>
          Cancelar
        </Button>
      ) : null}
    </div>
  );
}

function Separador() {
  return <span aria-hidden="true"> · </span>;
}
