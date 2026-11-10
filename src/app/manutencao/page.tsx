import { redirect } from 'next/navigation';
import { listarFila, type FilaListada } from '@/app/actions/manutencao-ordem-consulta';
import { FilaOrdens } from '@/features/manutencao/components/FilaOrdens';
import { FilaVazia } from '@/features/manutencao/components/FilaVazia';
import { FilaFundacao } from '@/domain/manutencao/fila-fundacao';
import {
  MODULOS_MANUTENCAO_ENTRADA,
  ManutencaoAcesso,
} from '@/domain/manutencao/manutencao-acesso';
import { requireInternoQualquerModulo } from '@/lib/auth/require-interno-modulo';

export const dynamic = 'force-dynamic';

export default async function ManutencaoFilaPage() {
  const { snap } = await requireInternoQualquerModulo(MODULOS_MANUTENCAO_ENTRADA, 'ler');
  const acesso = new ManutencaoAcesso();
  if (!acesso.veFila(snap)) redirect('/?erro=sem-permissao');

  const fila = await listarFila();
  const aviso = avisoSemSetor(fila);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      {aviso ? (
        <FilaVazia mensagem={aviso} />
      ) : (
        <FilaOrdens
          itens={fila.itens}
          mensagem={fila.mensagem}
          podeAbrir={acesso.abreCorretiva(snap)}
        />
      )}
    </div>
  );
}

function avisoSemSetor(fila: FilaListada): string | null {
  const aviso = new FilaFundacao().mensagem(false, 0);
  if (fila.itens.length === 0 && fila.mensagem === aviso) return aviso;
  return null;
}
