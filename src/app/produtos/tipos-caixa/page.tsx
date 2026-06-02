import {
  listClientesOpcoesTipoCaixa,
  listTiposCaixaEmbalagem,
} from '@/app/actions/tipos-caixa-embalagem-actions';
import TiposCaixaClient from './TiposCaixaClient';

export const dynamic = 'force-dynamic';

export default async function TiposCaixaEmbalagemPage() {
  const [tiposRes, clientesRes] = await Promise.all([
    listTiposCaixaEmbalagem(),
    listClientesOpcoesTipoCaixa(),
  ]);
  const tipos = tiposRes.success ? tiposRes.data : [];
  const clientes = clientesRes.success ? clientesRes.data : [];
  const loadError =
    !tiposRes.success ? tiposRes.error : !clientesRes.success ? clientesRes.error : null;

  return <TiposCaixaClient tiposInicial={tipos} clientesOpcoes={clientes} loadError={loadError} />;
}
