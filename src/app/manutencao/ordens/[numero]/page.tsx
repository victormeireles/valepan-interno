import { redirect } from 'next/navigation';
import { listarAjudantesOficina } from '@/app/actions/manutencao-ordem-ajudantes';
import { carregarOrdem, type OrdemCarregada } from '@/app/actions/manutencao-ordem-consulta';
import { listarPecas } from '@/app/manutencao/manutencao-peca-consulta';
import { OrdemDetalhe } from '@/features/manutencao/components/OrdemDetalhe';
import { ParedeSaoPaulo } from '@/features/manutencao/components/parede-sao-paulo';

export const dynamic = 'force-dynamic';

type PaginaOrdemProps = { params: Promise<{ numero: string }> };

type PecaEscolha = { id: string; codigo: string; nome: string; unidade: string };

type ApoioFinalizacao = {
  pecas: PecaEscolha[];
  ajudantes: { id: string; nome: string }[];
  inicioPadrao: string;
  fimPadrao: string;
  inicioIsoPadrao: string;
  fimIsoPadrao: string;
};

const APOIO_VAZIO: ApoioFinalizacao = {
  pecas: [],
  ajudantes: [],
  inicioPadrao: '',
  fimPadrao: '',
  inicioIsoPadrao: '',
  fimIsoPadrao: '',
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
  if (!ordem.podeFinalizar) return APOIO_VAZIO;
  const parede = new ParedeSaoPaulo();
  const agoraIso = new Date().toISOString();
  const [pecas, ajudantes] = await Promise.all([
    listarPecas(),
    listarAjudantesOficina(ordem.numero),
  ]);
  return {
    pecas: pecas.filter((peca) => peca.ativo).map(pecaEscolha),
    ajudantes,
    inicioPadrao: ordem.recebidaEm ? parede.deIso(ordem.recebidaEm) : '',
    fimPadrao: parede.deIso(agoraIso),
    inicioIsoPadrao: ordem.recebidaEm ?? '',
    fimIsoPadrao: agoraIso,
  };
}

function pecaEscolha(peca: {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
}): PecaEscolha {
  return { id: peca.id, codigo: peca.codigo, nome: peca.nome, unidade: peca.unidade };
}
