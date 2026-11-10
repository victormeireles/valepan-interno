'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { registrarEntrada, registrarSaida } from '@/app/manutencao/manutencao-estoque-actions';
import {
  avaliarRemocaoPeca,
  removerPeca,
  salvarPeca,
} from '@/app/manutencao/manutencao-peca-actions';
import type { PecaItem } from '@/app/manutencao/manutencao-peca-consulta';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { PecaListaFiltro } from '@/domain/manutencao/peca-lista-filtro';
import {
  FORMULARIO_PECA_VAZIO,
  type PecaFormularioValor,
} from './PecaFormulario';
import { PecaFormularioModal } from './PecaFormularioModal';
import {
  PecaMovimentoModal,
  type TipoMovimentoPeca,
} from './PecaMovimentoModal';
import { PecasLista } from './PecasLista';
import { RemocaoCadastroModal } from './RemocaoCadastroModal';
import { useCadastroRemocao } from './useCadastroRemocao';
import type { PedidoEntrada, PedidoSaida } from './movimento-pedido';

type PecasPainelProps = {
  pecas: PecaItem[];
  podeCadastrar: boolean;
  podeMovimentar: boolean;
};

type Aviso = { texto: string; ok: boolean };
type Resultado = { ok: boolean; mensagem: string };

const filtroPecas = new PecaListaFiltro();

export function PecasPainel({ pecas, podeCadastrar, podeMovimentar }: PecasPainelProps) {
  const [termo, setTermo] = useState('');
  const [avisoRemocao, setAvisoRemocao] = useState<Aviso | null>(null);
  const cadastro = useCadastroPecaModal();
  const movimento = useMovimentoPecaModal();
  const remocao = useCadastroRemocao({
    entidade: 'peça',
    avaliar: avaliarRemocaoPeca,
    remover: removerPeca,
    onAviso: setAvisoRemocao,
    descricaoConfirmacao: (rotulo) =>
      `Remover ${rotulo}? Os movimentos de estoque desta peça também serão apagados.`,
  });
  const filtradas = useMemo(() => filtroPecas.aplicar(pecas, termo), [pecas, termo]);
  const aviso = avisoRemocao ?? cadastro.aviso ?? movimento.aviso;

  return (
    <div className="space-y-4">
      <CabecalhoPecas
        totalVisivel={filtradas.length}
        totalGeral={pecas.length}
        termoAtivo={termo.trim().length > 0}
        podeCadastrar={podeCadastrar}
        onCriar={cadastro.abrirCriacao}
      />
      {aviso ? <AvisoToast aviso={aviso} /> : null}
      <PecasLista
        pecas={filtradas}
        termo={termo}
        totalGeral={pecas.length}
        podeCadastrar={podeCadastrar}
        podeMovimentar={podeMovimentar}
        onTermo={setTermo}
        onCriar={cadastro.abrirCriacao}
        onEditar={cadastro.abrirEdicao}
        onRemover={(peca) =>
          void remocao.pedirRemocao({ id: peca.id, rotulo: `${peca.codigo} · ${peca.nome}` })
        }
        onEntrada={movimento.abrirEntrada}
        onSaida={movimento.abrirSaida}
      />
      <PecaFormularioModal
        aberto={cadastro.aberto}
        valorInicial={cadastro.valorInicial}
        podeCadastrar={podeCadastrar}
        onFechar={cadastro.fechar}
        onSalvar={cadastro.gravar}
      />
      <PecaMovimentoModal
        aberto={movimento.aberto}
        tipo={movimento.tipo}
        peca={movimento.peca}
        onFechar={movimento.fechar}
        onEntrada={movimento.entrar}
        onSaida={movimento.sair}
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

function CabecalhoPecas({
  totalVisivel,
  totalGeral,
  termoAtivo,
  podeCadastrar,
  onCriar,
}: {
  totalVisivel: number;
  totalGeral: number;
  termoAtivo: boolean;
  podeCadastrar: boolean;
  onCriar: () => void;
}) {
  const resumo = resumoCabecalho(totalVisivel, totalGeral, termoAtivo);

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Peças</h1>
        <p className="mt-0.5 text-sm text-stone-500">{resumo}</p>
      </div>
      {podeCadastrar ? (
        <Button type="button" size="lg" icon="add" onClick={onCriar}>
          Nova peça
        </Button>
      ) : null}
    </div>
  );
}

function resumoCabecalho(totalVisivel: number, totalGeral: number, termoAtivo: boolean): string {
  if (totalGeral === 0) return 'Nenhuma peça';
  if (termoAtivo) {
    return `${totalVisivel} de ${totalGeral} peça${totalGeral === 1 ? '' : 's'}`;
  }
  return `${totalGeral} peça${totalGeral === 1 ? '' : 's'}`;
}

function useCadastroPecaModal() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [valorInicial, setValorInicial] = useState<PecaFormularioValor | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  function abrirCriacao() {
    setValorInicial(FORMULARIO_PECA_VAZIO);
    setAberto(true);
    setAviso(null);
  }

  function abrirEdicao(peca: PecaItem) {
    setValorInicial(valorDaPeca(peca));
    setAberto(true);
    setAviso(null);
  }

  function fechar() {
    setAberto(false);
    setValorInicial(null);
  }

  async function gravar(entrada: PecaFormularioValor): Promise<Resultado> {
    try {
      const resultado = await salvarPeca(entrada);
      if (resultado.ok) {
        setAviso({
          texto: entrada.id ? 'Peça atualizada.' : 'Peça criada.',
          ok: true,
        });
        router.refresh();
      }
      return resultado;
    } catch {
      return { ok: false, mensagem: 'Não foi possível salvar.' };
    }
  }

  return { aberto, valorInicial, aviso, abrirCriacao, abrirEdicao, fechar, gravar };
}

function useMovimentoPecaModal() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoMovimentoPeca | null>(null);
  const [peca, setPeca] = useState<PecaItem | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const aberto = tipo !== null && peca !== null;

  function abrirEntrada(item: PecaItem) {
    setPeca(item);
    setTipo('entrada');
    setAviso(null);
  }

  function abrirSaida(item: PecaItem) {
    setPeca(item);
    setTipo('saida');
    setAviso(null);
  }

  function fechar() {
    setTipo(null);
    setPeca(null);
  }

  function entrar(pedido: PedidoEntrada) {
    return dispararMovimento(pedido.pecaId, setAviso, () => router.refresh(), () =>
      registrarEntrada(pedido.pecaId, pedido.quantidade, pedido.preco),
    );
  }

  function sair(pedido: PedidoSaida) {
    return dispararMovimento(pedido.pecaId, setAviso, () => router.refresh(), () =>
      registrarSaida(pedido.pecaId, pedido.quantidade, pedido.motivo),
    );
  }

  return { aberto, tipo, peca, aviso, abrirEntrada, abrirSaida, fechar, entrar, sair };
}

async function dispararMovimento(
  pecaId: string,
  publicar: (aviso: Aviso) => void,
  atualizar: () => void,
  acao: () => Promise<Resultado>,
): Promise<Resultado> {
  if (!pecaId) return publicarFalha(publicar, 'Selecione a peça.');
  try {
    const resultado = await acao();
    publicar({ texto: resultado.mensagem, ok: resultado.ok });
    if (resultado.ok) atualizar();
    return resultado;
  } catch {
    return publicarFalha(publicar, 'Não foi possível movimentar.');
  }
}

function AvisoToast({ aviso }: { aviso: Aviso }) {
  return (
    <Toast tone={aviso.ok ? 'success' : 'error'} icon={aviso.ok ? 'check_circle' : 'error'}>
      {aviso.texto}
    </Toast>
  );
}

function valorDaPeca(peca: PecaItem): PecaFormularioValor {
  return {
    id: peca.id,
    codigo: peca.codigo,
    nome: peca.nome,
    unidade: peca.unidade,
    ativo: peca.ativo,
  };
}

function publicarFalha(publicar: (aviso: Aviso) => void, texto: string): Resultado {
  publicar({ texto, ok: false });
  return { ok: false, mensagem: texto };
}
