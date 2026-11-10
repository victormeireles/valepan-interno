'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  avaliarRemocaoPlano,
  removerPlano,
  salvarPlano,
  type EntradaSalvarPlano,
} from '@/app/actions/manutencao-plano-actions';
import type { PlanoItem } from '@/app/actions/manutencao-plano-consulta';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { PlanoListaFiltro } from '@/domain/manutencao/plano-lista-filtro';
import {
  FORMULARIO_PLANO_VAZIO,
  type MaquinaPlanoOpcao,
  type PlanoFormularioValor,
} from './PlanoFormulario';
import { PlanoFormularioModal } from './PlanoFormularioModal';
import { PlanosLista } from './PlanosLista';
import { RemocaoCadastroModal } from './RemocaoCadastroModal';
import { useCadastroRemocao } from './useCadastroRemocao';

type PlanosPainelProps = {
  planos: PlanoItem[];
  maquinas: MaquinaPlanoOpcao[];
  podeEditar: boolean;
  podeExcluir: boolean;
};

type Aviso = { texto: string; ok: boolean };
type Resultado = { ok: boolean; mensagem: string };

const filtroPlanos = new PlanoListaFiltro();

export function PlanosPainel({
  planos,
  maquinas,
  podeEditar,
  podeExcluir,
}: PlanosPainelProps) {
  const [termo, setTermo] = useState('');
  const cadastro = useCadastroPlanoModal();
  const remocao = useCadastroRemocao({
    entidade: 'plano',
    avaliar: avaliarRemocaoPlano,
    remover: removerPlano,
    onAviso: cadastro.definirAviso,
    onSucesso: () => cadastro.aposRemocao(),
  });
  const filtrados = useMemo(() => filtroPlanos.aplicar(planos, termo), [planos, termo]);

  return (
    <div className="space-y-4">
      <CabecalhoPlanos
        totalVisivel={filtrados.length}
        totalGeral={planos.length}
        termoAtivo={termo.trim().length > 0}
        podeEditar={podeEditar}
        onCriar={cadastro.abrirCriacao}
      />
      {cadastro.aviso ? <AvisoToast aviso={cadastro.aviso} /> : null}
      <PlanosLista
        planos={filtrados}
        termo={termo}
        totalGeral={planos.length}
        podeEditar={podeEditar}
        podeExcluir={podeExcluir}
        onTermo={setTermo}
        onCriar={cadastro.abrirCriacao}
        onEditar={cadastro.abrirEdicao}
        onRemover={(plano) =>
          void remocao.pedirRemocao({
            id: plano.id,
            rotulo: rotuloPlano(plano),
          })
        }
      />
      <PlanoFormularioModal
        aberto={cadastro.aberto}
        valorInicial={cadastro.valorInicial}
        maquinas={maquinas}
        onFechar={cadastro.fechar}
        onSalvar={cadastro.gravar}
      />
      <RemocaoCadastroModal
        estado={remocao.estado}
        salvando={remocao.salvando}
        onFechar={remocao.fechar}
        onConfirmar={remocao.confirmar}
      />
    </div>
  );
}

function CabecalhoPlanos({
  totalVisivel,
  totalGeral,
  termoAtivo,
  podeEditar,
  onCriar,
}: {
  totalVisivel: number;
  totalGeral: number;
  termoAtivo: boolean;
  podeEditar: boolean;
  onCriar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Preventiva</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {resumoCabecalho(totalVisivel, totalGeral, termoAtivo)}
        </p>
      </div>
      {podeEditar ? (
        <Button type="button" size="lg" icon="add" onClick={onCriar}>
          Novo plano
        </Button>
      ) : null}
    </div>
  );
}

function resumoCabecalho(totalVisivel: number, totalGeral: number, termoAtivo: boolean): string {
  if (totalGeral === 0) return 'Nenhum plano';
  if (termoAtivo) {
    return `${totalVisivel} de ${totalGeral} plano${totalGeral === 1 ? '' : 's'}`;
  }
  return `${totalGeral} plano${totalGeral === 1 ? '' : 's'}`;
}

function useCadastroPlanoModal() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [valorInicial, setValorInicial] = useState<PlanoFormularioValor | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  function abrirCriacao() {
    setValorInicial(FORMULARIO_PLANO_VAZIO);
    setAberto(true);
    setAviso(null);
  }

  function abrirEdicao(plano: PlanoItem) {
    setValorInicial(valorDoPlano(plano));
    setAberto(true);
    setAviso(null);
  }

  function fechar() {
    setAberto(false);
    setValorInicial(null);
  }

  function aposRemocao() {
    router.refresh();
  }

  async function gravar(entrada: EntradaSalvarPlano): Promise<Resultado> {
    try {
      const resultado = await salvarPlano(entrada);
      if (resultado.ok) {
        setAviso({
          texto: entrada.id ? 'Plano atualizado.' : 'Plano criado.',
          ok: true,
        });
        router.refresh();
      }
      return resultado;
    } catch {
      return { ok: false, mensagem: 'Não foi possível salvar.' };
    }
  }

  return {
    aberto,
    valorInicial,
    aviso,
    definirAviso: setAviso,
    abrirCriacao,
    abrirEdicao,
    fechar,
    gravar,
    aposRemocao,
  };
}

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

function rotuloPlano(plano: PlanoItem): string {
  const maquina = [plano.maquinaCodigo, plano.maquinaNome].filter(Boolean).join(' · ');
  return maquina || 'plano preventivo';
}

function AvisoToast({ aviso }: { aviso: Aviso }) {
  return (
    <Toast tone={aviso.ok ? 'success' : 'error'} icon={aviso.ok ? 'check_circle' : 'error'}>
      {aviso.texto}
    </Toast>
  );
}
