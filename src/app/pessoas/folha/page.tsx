import { resumirFolha } from '@/app/actions/pessoas-folha-actions';
import { FolhaTela } from '@/features/pessoas/components/FolhaTela';
import type { FolhaGrupoFiltro, FolhaRegimeFiltro } from '@/domain/pessoas/folha-resumo';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';

export const dynamic = 'force-dynamic';

export default async function FolhaPage({
  searchParams,
}: {
  searchParams: Promise<{ regime?: string; grupo?: string }>;
}) {
  await requireInternoModulo('interno_pessoas', 'administrar');
  const params = await searchParams;
  const regime = regimeDe(params.regime);
  const grupo = grupoDe(params.grupo);
  const folha = await resumirFolha(regime, grupo);
  return <FolhaTela vista={folha.vista} regime={regime} grupo={grupo} hoje={folha.hoje} />;
}

function regimeDe(valor: string | undefined): FolhaRegimeFiltro {
  if (valor === 'clt' || valor === 'pj') return valor;
  return '';
}

function grupoDe(valor: string | undefined): FolhaGrupoFiltro {
  if (valor === 'ativos' || valor === 'a_entrar') return valor;
  return '';
}
