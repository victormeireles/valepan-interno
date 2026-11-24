import { listarOpcoesCargo } from '@/app/actions/pessoas-cargo-actions';
import { listQuadro } from '@/app/actions/pessoas-quadro-actions';
import { listTurnosVinculo } from '@/app/actions/pessoas-vinculo-actions';
import { QuadroLista } from '@/features/pessoas/components/QuadroLista';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';

export const dynamic = 'force-dynamic';

export default async function PessoasQuadroPage() {
  const sessao = await requireInternoModulo('interno_pessoas', 'ler');
  const podeEditar = new InternoAccessManager().temModulo(sessao, 'interno_pessoas', 'editar');
  const [setores, turnos, cargos] = await Promise.all([listQuadro(), listTurnosVinculo(), listarOpcoesCargo()]);
  return <QuadroLista setores={setores} turnos={turnos} cargos={cargos} podeEditar={podeEditar} />;
}
