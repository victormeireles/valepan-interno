import { redirect } from 'next/navigation';
import { listarAjudantesOficina } from '@/app/actions/manutencao-ordem-ajudantes';
import { carregarOrdem, type OrdemCarregada } from '@/app/actions/manutencao-ordem-consulta';
import { listarPecas, type PecaItem } from '@/app/manutencao/manutencao-peca-consulta';
import { OrdemDetalhe } from '@/features/manutencao/components/OrdemDetalhe';
import type {
  ApoioFinalizacao,
  LinhaPeca,
  PecaEscolha,
  ValoresIniciaisFinalizacao,
} from '@/features/manutencao/components/ordem-finalizar-estado';
import { ParedeSaoPaulo } from '@/features/manutencao/components/parede-sao-paulo';
import { ConversorSaldo } from '@/domain/manutencao/conversor-saldo';
import { QuantidadeEstoque } from '@/domain/manutencao/quantidade-estoque';

export const dynamic = 'force-dynamic';

type PaginaOrdemProps = { params: Promise<{ numero: string }> };

const APOIO_VAZIO: ApoioFinalizacao = {
  pecas: [],
  ajudantes: [],
  inicioPadrao: '',
  fimPadrao: '',
  inicioIsoPadrao: '',
  fimIsoPadrao: '',
  iniciais: null,
};

export default async function PaginaOrdem({ params }: PaginaOrdemProps) {
  const { numero } = await params;
  const ordem = await carregarOrdem(Number(numero));
  if (!ordem) redirect('/?erro=sem-permissao');

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <OrdemDetalhe ordem={ordem} apoio={await apoioDe(ordem)} />
    </div>
  );
}

async function apoioDe(ordem: OrdemCarregada): Promise<ApoioFinalizacao> {
  if (!ordem.podeFinalizar && !ordem.podeEditarFinalizacao) return APOIO_VAZIO;
  const parede = new ParedeSaoPaulo();
  const agoraIso = new Date().toISOString();
  const [pecas, ajudantes] = await Promise.all([
    listarPecas(),
    listarAjudantesOficina(ordem.numero),
  ]);
  const escolhas = escolhasPeca(pecas, ordem);
  if (ordem.podeEditarFinalizacao) {
    return {
      pecas: escolhas,
      ajudantes,
      inicioPadrao: ordem.inicioEm ? parede.deIso(ordem.inicioEm) : '',
      fimPadrao: ordem.fimEm ? parede.deIso(ordem.fimEm) : '',
      inicioIsoPadrao: ordem.inicioEm ?? '',
      fimIsoPadrao: ordem.fimEm ?? '',
      iniciais: iniciaisDe(ordem, pecas),
    };
  }
  return {
    pecas: escolhas.filter((peca) => pecaAtiva(pecas, peca.id)),
    ajudantes,
    inicioPadrao: ordem.recebidaEm ? parede.deIso(ordem.recebidaEm) : '',
    fimPadrao: parede.deIso(agoraIso),
    inicioIsoPadrao: ordem.recebidaEm ?? '',
    fimIsoPadrao: agoraIso,
    iniciais: null,
  };
}

function escolhasPeca(pecas: PecaItem[], ordem: OrdemCarregada): PecaEscolha[] {
  const usadas = new Set(ordem.pecas.map((peca) => peca.pecaId));
  return pecas
    .filter((peca) => peca.ativo || usadas.has(peca.id))
    .map((peca) => ({
      id: peca.id,
      codigo: peca.codigo,
      nome: peca.nome,
      unidade: peca.unidade,
      saldo: peca.saldo,
    }));
}

function pecaAtiva(pecas: PecaItem[], id: string): boolean {
  return pecas.some((peca) => peca.id === id && peca.ativo);
}

function iniciaisDe(ordem: OrdemCarregada, pecas: PecaItem[]): ValoresIniciaisFinalizacao {
  const porId = new Map(pecas.map((peca) => [peca.id, peca]));
  const quantidades = new QuantidadeEstoque();
  const saldos = new ConversorSaldo();
  const linhas: LinhaPeca[] = ordem.pecas.map((peca) => {
    const cadastro = porId.get(peca.pecaId);
    return {
      pecaId: peca.pecaId,
      rotulo: cadastro ? `${cadastro.codigo} · ${cadastro.nome}` : peca.nome,
      quantidadeTexto: quantidades.formatar(saldos.emMilesimos(peca.quantidade)),
      unidade: cadastro?.unidade ?? '',
    };
  });
  return {
    servicos: ordem.servicos ?? '',
    linhas,
    ajudanteIds: ordem.ajudantes.map((ajudante) => ajudante.id),
  };
}
