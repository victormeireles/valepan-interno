'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  avaliarRemocaoMaquina,
  removerMaquina,
  salvarMaquina,
  type MaquinaItem,
} from '@/app/actions/manutencao-maquina-actions';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { MaquinaListaFiltro } from '@/domain/manutencao/maquina-lista-filtro';
import type { SetorLinha } from '@/domain/manutencao/setor-operacional';
import {
  FORMULARIO_MAQUINA_VAZIO,
  type MaquinaFormularioValor,
} from './MaquinaFormulario';
import { MaquinaFormularioModal } from './MaquinaFormularioModal';
import { MaquinasLista } from './MaquinasLista';
import { RemocaoCadastroModal } from './RemocaoCadastroModal';
import { useCadastroRemocao } from './useCadastroRemocao';

type MaquinasPainelProps = {
  maquinas: MaquinaItem[];
  setores: SetorLinha[];
  podeGravar: boolean;
};

type Aviso = { texto: string; ok: boolean };
type Resultado = { ok: boolean; mensagem: string };

const filtroMaquinas = new MaquinaListaFiltro();

export function MaquinasPainel({ maquinas, setores, podeGravar }: MaquinasPainelProps) {
  const [termo, setTermo] = useState('');
  const cadastro = useCadastroMaquinaModal();
  const remocao = useCadastroRemocao({
    entidade: 'máquina',
    avaliar: avaliarRemocaoMaquina,
    remover: removerMaquina,
    onAviso: cadastro.definirAviso,
  });
  const filtradas = useMemo(() => filtroMaquinas.aplicar(maquinas, termo), [maquinas, termo]);

  return (
    <div className="space-y-4">
      <CabecalhoMaquinas
        totalVisivel={filtradas.length}
        totalGeral={maquinas.length}
        termoAtivo={termo.trim().length > 0}
        podeGravar={podeGravar}
        onCriar={cadastro.abrirCriacao}
      />
      {cadastro.aviso ? <AvisoToast aviso={cadastro.aviso} /> : null}
      <MaquinasLista
        maquinas={filtradas}
        termo={termo}
        totalGeral={maquinas.length}
        podeGravar={podeGravar}
        onTermo={setTermo}
        onCriar={cadastro.abrirCriacao}
        onEditar={cadastro.abrirEdicao}
        onRemover={(maquina) =>
          void remocao.pedirRemocao({
            id: maquina.id,
            rotulo: `${maquina.codigo} · ${maquina.nome}`,
          })
        }
      />
      <MaquinaFormularioModal
        aberto={cadastro.aberto}
        valorInicial={cadastro.valorInicial}
        setores={setores}
        podeGravar={podeGravar}
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

function CabecalhoMaquinas({
  totalVisivel,
  totalGeral,
  termoAtivo,
  podeGravar,
  onCriar,
}: {
  totalVisivel: number;
  totalGeral: number;
  termoAtivo: boolean;
  podeGravar: boolean;
  onCriar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Máquinas</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {resumoCabecalho(totalVisivel, totalGeral, termoAtivo)}
        </p>
      </div>
      {podeGravar ? (
        <Button type="button" size="lg" icon="add" onClick={onCriar}>
          Nova máquina
        </Button>
      ) : null}
    </div>
  );
}

function resumoCabecalho(totalVisivel: number, totalGeral: number, termoAtivo: boolean): string {
  if (totalGeral === 0) return 'Nenhuma máquina';
  if (termoAtivo) {
    return `${totalVisivel} de ${totalGeral} máquina${totalGeral === 1 ? '' : 's'}`;
  }
  return `${totalGeral} máquina${totalGeral === 1 ? '' : 's'}`;
}

function useCadastroMaquinaModal() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [valorInicial, setValorInicial] = useState<MaquinaFormularioValor | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  function abrirCriacao() {
    setValorInicial(FORMULARIO_MAQUINA_VAZIO);
    setAberto(true);
    setAviso(null);
  }

  function abrirEdicao(maquina: MaquinaItem) {
    setValorInicial(valorDaMaquina(maquina));
    setAberto(true);
    setAviso(null);
  }

  function fechar() {
    setAberto(false);
    setValorInicial(null);
  }

  async function gravar(entrada: MaquinaFormularioValor): Promise<Resultado> {
    try {
      const resultado = await salvarMaquina(entrada);
      if (resultado.ok) {
        setAviso({
          texto: entrada.id ? 'Máquina atualizada.' : 'Máquina criada.',
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
  };
}

function valorDaMaquina(maquina: MaquinaItem): MaquinaFormularioValor {
  return {
    id: maquina.id,
    codigo: maquina.codigo,
    nome: maquina.nome,
    setorId: maquina.setorId,
    setorNome: maquina.setorNome,
    observacao: maquina.observacao,
    ativo: maquina.ativo,
  };
}

function AvisoToast({ aviso }: { aviso: Aviso }) {
  return (
    <Toast tone={aviso.ok ? 'success' : 'error'} icon={aviso.ok ? 'check_circle' : 'error'}>
      {aviso.texto}
    </Toast>
  );
}
