'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inativarPlano, salvarPlano } from '@/app/actions/manutencao-plano-actions';
import type { EntradaSalvarPlano } from '@/app/actions/manutencao-plano-actions';
import type { PlanoItem } from '@/app/actions/manutencao-plano-consulta';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  FORMULARIO_PLANO_VAZIO,
  PlanoFormulario,
  type MaquinaPlanoOpcao,
  type PlanoFormularioValor,
} from './PlanoFormulario';

const CARTAO = 'overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm';

type PlanosPainelProps = {
  planos: PlanoItem[];
  maquinas: MaquinaPlanoOpcao[];
  podeEditar: boolean;
};

type Aviso = { texto: string; ok: boolean };
type Resultado = { ok: boolean; mensagem: string };

const rotulos = new RotuloPlanoPreventivo();

export function PlanosPainel({ planos, maquinas, podeEditar }: PlanosPainelProps) {
  const painel = usePlanosPainel();

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-stone-900">
        <span className="material-icons text-amber-700" aria-hidden="true">
          event_repeat
        </span>
        Preventiva
      </h1>
      {podeEditar ? (
        <PlanoFormulario
          key={painel.versao}
          maquinas={maquinas}
          valor={painel.valor}
          onSubmit={painel.gravar}
        />
      ) : null}
      {painel.aviso ? <AvisoSalvar aviso={painel.aviso} /> : null}
      <ListaPlanos
        planos={planos}
        podeEditar={podeEditar}
        confirmandoId={painel.confirmandoId}
        onEditar={painel.editar}
        onRemover={painel.remover}
      />
    </div>
  );
}

function usePlanosPainel() {
  const router = useRouter();
  const [valor, setValor] = useState(FORMULARIO_PLANO_VAZIO);
  const [versao, setVersao] = useState(0);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  function editar(plano: PlanoItem) {
    setValor(valorDoPlano(plano));
    setVersao((atual) => atual + 1);
    setAviso(null);
    setConfirmandoId(null);
  }

  function gravar(entrada: EntradaSalvarPlano) {
    return executar(() => salvarPlano(entrada), setAviso, 'Não foi possível salvar.', () => {
      setValor(FORMULARIO_PLANO_VAZIO);
      setVersao((atual) => atual + 1);
      setConfirmandoId(null);
      router.refresh();
    });
  }

  function remover(id: string) {
    if (confirmandoId !== id) {
      setConfirmandoId(id);
      return;
    }
    return executar(() => inativarPlano(id), setAviso, 'Não foi possível remover.', () => {
      setConfirmandoId(null);
      if (valor.id === id) {
        setValor(FORMULARIO_PLANO_VAZIO);
        setVersao((atual) => atual + 1);
      }
      router.refresh();
    });
  }

  return { valor, versao, aviso, confirmandoId, editar, gravar, remover };
}

function ListaPlanos({
  planos,
  podeEditar,
  confirmandoId,
  onEditar,
  onRemover,
}: {
  planos: PlanoItem[];
  podeEditar: boolean;
  confirmandoId: string | null;
  onEditar: (plano: PlanoItem) => void;
  onRemover: (id: string) => void;
}) {
  if (planos.length === 0) {
    return <p className={`${CARTAO} px-4 py-6 text-sm text-stone-600`}>Nenhum plano.</p>;
  }

  return (
    <ul className={CARTAO}>
      {planos.map((plano, indice) => (
        <LinhaPlano
          key={plano.id}
          plano={plano}
          par={indice % 2 === 1}
          podeEditar={podeEditar}
          confirmando={confirmandoId === plano.id}
          onEditar={onEditar}
          onRemover={onRemover}
        />
      ))}
    </ul>
  );
}

function LinhaPlano({
  plano,
  par,
  podeEditar,
  confirmando,
  onEditar,
  onRemover,
}: {
  plano: PlanoItem;
  par: boolean;
  podeEditar: boolean;
  confirmando: boolean;
  onEditar: (plano: PlanoItem) => void;
  onRemover: (id: string) => void;
}) {
  const fundo = par ? 'bg-stone-50/60' : 'bg-white';

  return (
    <li
      className={`flex min-h-11 flex-col gap-3 border-b border-stone-100 px-4 py-3 last:border-b-0 hover:bg-amber-50/60 sm:flex-row sm:items-center sm:justify-between ${fundo}`}
    >
      <DadosPlano plano={plano} />
      {podeEditar ? (
        <AcoesPlano
          confirmando={confirmando}
          onEditar={() => onEditar(plano)}
          onRemover={() => onRemover(plano.id)}
        />
      ) : null}
    </li>
  );
}

function DadosPlano({ plano }: { plano: PlanoItem }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-stone-900">
        <IdentidadeMaquina codigo={plano.maquinaCodigo} nome={plano.maquinaNome} />
      </p>
      <p className="truncate text-sm text-stone-600">{rotulos.frequencia(plano)}</p>
      <p className="text-sm text-stone-600">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
          Próxima{' '}
        </span>
        <span className="font-mono tabular-nums text-stone-900">{rotulos.data(plano.proximaEm)}</span>
      </p>
      {plano.temOrdemAberta ? (
        <Badge tone="accent" className="mt-1">
          Aberta ou recebida
        </Badge>
      ) : null}
    </div>
  );
}

function AcoesPlano({
  confirmando,
  onEditar,
  onRemover,
}: {
  confirmando: boolean;
  onEditar: () => void;
  onRemover: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" size="lg" onClick={onEditar}>
        Editar
      </Button>
      <Button
        type="button"
        variant={confirmando ? 'danger' : 'ghost'}
        size="lg"
        onClick={onRemover}
      >
        {confirmando ? 'Confirmar remoção' : 'Remover'}
      </Button>
    </div>
  );
}

function AvisoSalvar({ aviso }: { aviso: Aviso }) {
  const cor = aviso.ok ? 'text-emerald-800' : 'text-red-700';
  return (
    <p className={`text-sm ${cor}`} role={aviso.ok ? 'status' : 'alert'}>
      {aviso.texto}
    </p>
  );
}

function IdentidadeMaquina({ codigo, nome }: { codigo: string; nome: string }) {
  const codigoLimpo = codigo.trim();
  const nomeLimpo = nome.trim();
  if (!codigoLimpo && !nomeLimpo) return 'Máquina';
  return (
    <>
      {codigoLimpo ? <span className="font-mono tabular-nums">{codigoLimpo}</span> : null}
      {codigoLimpo && nomeLimpo ? ' · ' : null}
      {nomeLimpo}
    </>
  );
}

class RotuloPlanoPreventivo {
  frequencia(plano: PlanoItem): string {
    if (plano.frequenciaTipo === 'a_cada_n_dias') return this.intervalo(plano.intervaloDias);
    if (plano.frequenciaTipo === 'semanal') return this.semana(plano.diaSemana);
    return this.mes(plano.diaMes);
  }

  data(iso: string): string {
    const [ano, mes, dia] = iso.slice(0, 10).split('-');
    if (!ano || !mes || !dia) return iso;
    return `${dia}/${mes}/${ano}`;
  }

  private intervalo(dias: number | null): string {
    const quantidade = dias ?? 0;
    if (quantidade === 1) return 'A cada 1 dia';
    return `A cada ${quantidade} dias`;
  }

  private semana(dia: number | null): string {
    const nome = DIAS[dia ?? 0];
    if (!nome) return 'Semanal';
    const artigo = dia === 6 || dia === 7 ? 'Todo' : 'Toda';
    return `${artigo} ${nome}`;
  }

  private mes(dia: number | null): string {
    if (!dia) return 'Mensal';
    return `Todo dia ${dia}`;
  }
}

const DIAS = ['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

function valorDoPlano(plano: PlanoItem): PlanoFormularioValor {
  return {
    id: plano.id,
    maquinaId: plano.maquinaId,
    descricao: plano.descricao,
    tipo: plano.frequenciaTipo,
    intervalo: String(plano.intervaloDias ?? 7),
    diaSemana: String(plano.diaSemana ?? 1),
    diaMes: String(plano.diaMes ?? 1),
    data: plano.proximaEm.slice(0, 10),
  };
}

async function executar(
  acao: () => Promise<Resultado>,
  publicar: (aviso: Aviso) => void,
  falha: string,
  aoOk: () => void,
): Promise<Resultado> {
  try {
    const resultado = await acao();
    publicar({ texto: resultado.mensagem, ok: resultado.ok });
    if (resultado.ok) aoOk();
    return resultado;
  } catch {
    publicar({ texto: falha, ok: false });
    return { ok: false, mensagem: falha };
  }
}
